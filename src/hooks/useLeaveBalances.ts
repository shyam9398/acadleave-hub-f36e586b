import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaveBalanceRow {
  id: string;
  user_id: string;
  leave_type: string;
  opening: number;
  used: number;
  available: number | null;
  academic_year: string;
}

const DEFAULT_BALANCES: { leave_type: string; opening: number }[] = [
  { leave_type: 'casual', opening: 12 },
  { leave_type: 'earned', opening: 20 },
  { leave_type: 'medical', opening: 4 },
  { leave_type: 'od', opening: 0 },
];

function getAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function useMyLeaveBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-leave-balances', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;

      // If no balances exist, create defaults via edge function
      if (!data || data.length === 0) {
        const academicYear = getAcademicYear();
        // Use edge function to insert since RLS blocks direct insert
        const { error: fnError } = await supabase.functions.invoke('init-leave-balances', {
          body: { user_id: user!.id, academic_year: academicYear, defaults: DEFAULT_BALANCES },
        });
        if (fnError) {
          console.error('Failed to init leave balances:', fnError);
          // Return synthetic defaults for display
          return DEFAULT_BALANCES.map((d, i) => ({
            id: `temp-${i}`,
            user_id: user!.id,
            leave_type: d.leave_type,
            opening: d.opening,
            used: 0,
            available: d.opening,
            academic_year: academicYear,
          })) as LeaveBalanceRow[];
        }
        // Re-fetch after creation
        const { data: newData, error: refetchErr } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', user!.id);
        if (refetchErr) throw refetchErr;
        return (newData ?? []) as LeaveBalanceRow[];
      }

      return data as LeaveBalanceRow[];
    },
  });
}
