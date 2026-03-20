import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LopFacultyRow {
  user_id: string;
  full_name: string;
  department_name: string;
  lop_days: number;
}

export function useLopFaculty() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['lop-faculty', user?.departmentId],
    enabled: !!user,
    queryFn: async () => {
      // Get all leave_balances where leave_type = 'lop' and used > 0
      const { data: lopBalances, error } = await supabase
        .from('leave_balances')
        .select('user_id, used')
        .eq('leave_type', 'lop')
        .gt('used', 0);
      if (error) throw error;
      if (!lopBalances || lopBalances.length === 0) return [];

      // Also check users where CL+EL+ML used exceeds opening totals
      const { data: allBalances, error: allErr } = await supabase
        .from('leave_balances')
        .select('user_id, leave_type, opening, used');
      if (allErr) throw allErr;

      // Calculate LOP per user from CL+EL+ML
      const userLop = new Map<string, number>();

      // From explicit lop records
      for (const lb of lopBalances) {
        userLop.set(lb.user_id, (userLop.get(lb.user_id) || 0) + Number(lb.used));
      }

      // Also compute from CL+EL+ML overflow
      const userBalances = new Map<string, { totalOpening: number; totalUsed: number }>();
      for (const b of (allBalances || [])) {
        if (['casual', 'earned', 'medical'].includes(b.leave_type)) {
          const existing = userBalances.get(b.user_id) || { totalOpening: 0, totalUsed: 0 };
          existing.totalOpening += Number(b.opening);
          existing.totalUsed += Number(b.used);
          userBalances.set(b.user_id, existing);
        }
      }

      for (const [uid, bal] of userBalances) {
        const overflow = Math.max(0, bal.totalUsed - bal.totalOpening);
        if (overflow > 0 && !userLop.has(uid)) {
          userLop.set(uid, overflow);
        }
      }

      if (userLop.size === 0) return [];

      const userIds = Array.from(userLop.keys());

      // Get profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, department_id')
        .in('user_id', userIds);
      if (profErr) throw profErr;

      // Filter by department if junior_assistant
      const filteredProfiles = user?.role === 'junior_assistant'
        ? (profiles || []).filter(p => p.department_id === user.departmentId)
        : (profiles || []);

      // Get departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');
      const deptMap = new Map((departments || []).map(d => [d.id, d.name]));

      return filteredProfiles.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        department_name: deptMap.get(p.department_id || '') || 'Unknown',
        lop_days: userLop.get(p.user_id) || 0,
      })) as LopFacultyRow[];
    },
  });
}
