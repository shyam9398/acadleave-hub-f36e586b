import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserRolesMap = () => {
  return useQuery({
    queryKey: ['user-roles-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data || []) {
        // Map HOD and JR Assistant to 'Faculty' for leave requests
        map[row.user_id] = (row.role === 'hod' || row.role === 'junior_assistant') ? 'Faculty' : 'Faculty';
      }
      return map;
    },
  });
};
