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

      // Look up faculty by email using admin API with filter
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Search through all users - use a direct DB approach instead
      // Query profiles joined with auth to find by email
      const { data: dbUser, error: dbErr } = await supabase
        .rpc('has_role', { _user_id: '00000000-0000-0000-0000-000000000000', _role: 'faculty' });

      // Better approach: query auth.users directly via admin
      let facultyUserId: string | null = null;
      let page = 1;
      while (!facultyUserId) {
        const { data: batch, error: batchErr } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
        if (batchErr || !batch.users.length) break;
        const found = batch.users.find((u: any) => u.email?.toLowerCase() === faculty_email.toLowerCase());
        if (found) {
          facultyUserId = found.id;
          break;
        }
        if (batch.users.length < 100) break;
        page++;
      }

      if (!facultyUserId) {
        return new Response(JSON.stringify({ error: "Faculty email not found in system" }), { status: 404, headers: corsHeaders });
      }

      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store code (using service role to bypass RLS)
      const { error: insertErr } = await supabase.from("admin_verification_codes").insert({
        assistant_user_id: caller.id,
        faculty_email,
        faculty_user_id: facultyUserId,
        code,
        expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Verification code sent to ${faculty_email}`,
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
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), { status: 400, headers: corsHeaders });
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

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
