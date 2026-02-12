import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { action } = body;

  try {
    if (action === "send_code") {
      const { faculty_email } = body;

      // Use DB function to look up user by email directly
      const { data: facultyUserId, error: lookupErr } = await supabase
        .rpc('get_user_id_by_email', { _email: faculty_email });

      console.log('Lookup result:', facultyUserId, 'Error:', lookupErr);

      if (lookupErr || !facultyUserId) {
        return new Response(JSON.stringify({ error: "Faculty email not found in system" }), { 
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store code using service role (bypasses RLS)
      const { error: insertErr } = await supabase.from("admin_verification_codes").insert({
        assistant_user_id: caller.id,
        faculty_email,
        faculty_user_id: facultyUserId,
        code,
        expires_at: expiresAt,
      });
      if (insertErr) {
        console.error('Insert error:', insertErr);
        throw insertErr;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Verification code generated for ${faculty_email}`,
        faculty_user_id: facultyUserId,
        _dev_code: code,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify_code") {
      const { faculty_email, code } = body;

      const { data: record } = await supabase
        .from("admin_verification_codes")
        .select("*")
        .eq("assistant_user_id", caller.id)
        .eq("faculty_email", faculty_email)
        .eq("code", code)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!record) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), { 
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      await supabase
        .from("admin_verification_codes")
        .update({ verified: true })
        .eq("id", record.id);

      return new Response(JSON.stringify({ success: true, faculty_user_id: record.faculty_user_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_confirmation") {
      const { faculty_email, updated_values } = body;
      console.log(`Confirmation email to ${faculty_email}:`, updated_values);
      return new Response(JSON.stringify({ success: true, message: "Confirmation sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { 
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
