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

  // Verify caller
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const userId = body.user_id;
  const academicYear = body.academic_year;
  const defaults = body.defaults;

  // Only allow users to init their own balances
  if (userId !== caller.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if balances already exist
  const { data: existing } = await supabase
    .from("leave_balances")
    .select("id")
    .eq("user_id", userId)
    .eq("academic_year", academicYear)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ message: "Balances already exist" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = defaults.map((d: { leave_type: string; opening: number }) => ({
    user_id: userId,
    leave_type: d.leave_type,
    opening: d.opening,
    used: 0,
    academic_year: academicYear,
  }));

  const { error } = await supabase.from("leave_balances").insert(rows);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
