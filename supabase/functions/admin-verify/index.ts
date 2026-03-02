import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^\d{6}$/;
const VALID_ACTIONS = ["send_code", "verify_code", "send_confirmation"] as const;

const CODE_GEN_LIMIT = 5; // max codes per assistant per hour
const VERIFY_ATTEMPT_LIMIT = 5; // max verify attempts per code

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("authorization") ?? "";
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { action } = body;

  // Validate action
  if (!action || typeof action !== "string" || !VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return jsonResponse({ error: "Invalid action" }, 400);
  }

  try {
    if (action === "send_code") {
      const facultyEmail = typeof body.faculty_email === "string" ? body.faculty_email.trim().toLowerCase() : "";

      // Validate email
      if (!facultyEmail || !EMAIL_REGEX.test(facultyEmail) || facultyEmail.length > 255) {
        return jsonResponse({ error: "Invalid email format" }, 400);
      }

      // Rate limiting: check recent code generations by this assistant
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("admin_verification_codes")
        .select("id", { count: "exact", head: true })
        .eq("assistant_user_id", caller.id)
        .gte("created_at", oneHourAgo);

      if ((recentCount ?? 0) >= CODE_GEN_LIMIT) {
        return jsonResponse({ error: "Rate limit exceeded. Try again later." }, 429);
      }

      const { data: facultyUserId, error: lookupErr } = await supabase
        .rpc('get_user_id_by_email', { _email: facultyEmail });

      if (lookupErr || !facultyUserId) {
        return jsonResponse({ error: "Faculty email not found in system" }, 404);
      }

      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from("admin_verification_codes").insert({
        assistant_user_id: caller.id,
        faculty_email: facultyEmail,
        faculty_user_id: facultyUserId,
        code,
        expires_at: expiresAt,
      });
      if (insertErr) {
        console.error('Insert error:', insertErr);
        throw insertErr;
      }

      return jsonResponse({
        success: true,
        message: `Verification code generated for ${facultyEmail}`,
        faculty_user_id: facultyUserId,
      });
    }

    if (action === "verify_code") {
      const facultyEmail = typeof body.faculty_email === "string" ? body.faculty_email.trim().toLowerCase() : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";

      // Validate inputs
      if (!facultyEmail || !EMAIL_REGEX.test(facultyEmail) || facultyEmail.length > 255) {
        return jsonResponse({ error: "Invalid email format" }, 400);
      }
      if (!CODE_REGEX.test(code)) {
        return jsonResponse({ error: "Code must be exactly 6 digits" }, 400);
      }

      // Rate limiting: count recent failed verify attempts for this email by this assistant
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: attemptCount } = await supabase
        .from("admin_verification_codes")
        .select("id", { count: "exact", head: true })
        .eq("assistant_user_id", caller.id)
        .eq("faculty_email", facultyEmail)
        .eq("verified", false)
        .gte("created_at", tenMinutesAgo);

      if ((attemptCount ?? 0) > VERIFY_ATTEMPT_LIMIT) {
        return jsonResponse({ error: "Too many attempts. Request a new code." }, 429);
      }

      const { data: record } = await supabase
        .from("admin_verification_codes")
        .select("*")
        .eq("assistant_user_id", caller.id)
        .eq("faculty_email", facultyEmail)
        .eq("code", code)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!record) {
        return jsonResponse({ error: "Invalid or expired code" }, 400);
      }

      await supabase
        .from("admin_verification_codes")
        .update({ verified: true })
        .eq("id", record.id);

      return jsonResponse({ success: true, faculty_user_id: record.faculty_user_id });
    }

    if (action === "send_confirmation") {
      const facultyEmail = typeof body.faculty_email === "string" ? body.faculty_email.trim().toLowerCase() : "";

      if (!facultyEmail || !EMAIL_REGEX.test(facultyEmail) || facultyEmail.length > 255) {
        return jsonResponse({ error: "Invalid email format" }, 400);
      }

      const { data: facultyUserId } = await supabase
        .rpc('get_user_id_by_email', { _email: facultyEmail });

      let balanceSummary = "Your leave quotas have been updated.";
      if (facultyUserId) {
        const { data: balances } = await supabase
          .from("leave_balances")
          .select("leave_type, opening, used")
          .eq("user_id", facultyUserId);

        if (balances && balances.length > 0) {
          const labels: Record<string, string> = {
            casual: 'CL', earned: 'EL', medical: 'ML', od: 'OD', lop: 'LOP'
          };
          const lines = balances.map((b: { leave_type: string; opening: number; used: number }) =>
            `${labels[b.leave_type] || b.leave_type}: Total=${b.opening}, Used=${b.used}`
          ).join(', ');
          balanceSummary = `Updated leave counts: ${lines}`;
        }
      }

      if (facultyUserId) {
        await supabase.from("notifications").insert({
          user_id: facultyUserId,
          message: `${balanceSummary}. Please logout and login again to see updated leaves.`,
          type: "info",
        });
      }

      return jsonResponse({ success: true, message: "Confirmation sent to faculty" });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "An internal error occurred" }, 500);
  }
});
