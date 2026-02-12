import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const roleLabels: Record<string, string> = {
  faculty: 'Faculty',
  hod: 'HOD',
  junior_assistant: 'JR Assistant',
  principal: 'Principal',
};

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
        map[row.user_id] = roleLabels[row.role] || row.role;
      }
      return map;
    },
  });
};
