import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Academic year: June-May
    let newAcademicYear: string;
    let oldAcademicYear: string;
    if (currentMonth >= 6) {
      newAcademicYear = `${currentYear}-${currentYear + 1}`;
      oldAcademicYear = `${currentYear - 1}-${currentYear}`;
    } else {
      newAcademicYear = `${currentYear - 1}-${currentYear}`;
      oldAcademicYear = `${currentYear - 2}-${currentYear - 1}`;
    }

    // Get all profiles with year_of_joining
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, year_of_joining");
    if (profErr) throw profErr;

    let processed = 0;

    for (const profile of profiles || []) {
      const userId = profile.user_id;
      const yoj = profile.year_of_joining;
      const experience = yoj ? currentYear - yoj : 0;

      // Get old balances
      const { data: oldBalances } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", userId)
        .eq("academic_year", oldAcademicYear);

      const oldMap: Record<string, { opening: number; used: number }> = {};
      for (const b of oldBalances || []) {
        oldMap[b.leave_type] = { opening: b.opening, used: b.used };
      }

      // Calculate new openings
      const clOpening = 12; // Reset, no carry forward
      const mlRemaining = Math.max(0, (oldMap.medical?.opening || 20) - (oldMap.medical?.used || 0));
      const mlOpening = 20 + mlRemaining; // Carry forward
      const elRemaining = Math.max(0, (oldMap.earned?.opening || 0) - (oldMap.earned?.used || 0));
      const elBase = experience >= 3 ? 8 : 0;
      const elOpening = elBase + elRemaining; // Carry forward

      // Check if new year balances already exist
      const { data: existing } = await supabase
        .from("leave_balances")
        .select("id")
        .eq("user_id", userId)
        .eq("academic_year", newAcademicYear)
        .limit(1);

      if (existing && existing.length > 0) continue; // Already reset

      // Insert new year balances (bypass RLS with service role)
      const { error: insErr } = await supabase.rpc("execute_yearly_reset", {
        _user_id: userId,
        _academic_year: newAcademicYear,
        _cl_opening: clOpening,
        _ml_opening: mlOpening,
        _el_opening: elOpening,
      });

      // Fallback: direct insert if RPC doesn't exist
      if (insErr) {
        // Use service role - bypasses RLS
        const rows = [
          { user_id: userId, leave_type: "casual", opening: clOpening, used: 0, academic_year: newAcademicYear },
          { user_id: userId, leave_type: "medical", opening: mlOpening, used: 0, academic_year: newAcademicYear },
          { user_id: userId, leave_type: "earned", opening: elOpening, used: 0, academic_year: newAcademicYear },
          { user_id: userId, leave_type: "od", opening: 0, used: 0, academic_year: newAcademicYear },
          { user_id: userId, leave_type: "special", opening: 0, used: 0, academic_year: newAcademicYear },
        ];

        const { error: directErr } = await supabase
          .from("leave_balances")
          .insert(rows);
        if (directErr) {
          console.error(`Failed for user ${userId}:`, directErr);
          continue;
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed, newAcademicYear }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
