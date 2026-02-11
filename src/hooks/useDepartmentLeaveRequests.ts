import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequestRow } from './useLeaveRequests';

/** Returns leave requests scoped to the current user's department */
export function useDepartmentScopedRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dept-scoped-requests', user?.departmentId],
    enabled: !!user?.departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('department_id', user!.departmentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequestRow[];
    },
  });
}
