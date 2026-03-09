import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMyNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Poll every 30s for new notifications
  });
}

export function useUnreadCount() {
  const { data: notifications = [] } = useMyNotifications();
  return notifications.filter((n: any) => !n.read).length;
}

export function useMarkNotificationsViewed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, viewed_at: now } as any)
        .eq('user_id', user!.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications', user?.id] });
    },
  });
}

export function useDeleteViewedNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Delete notifications where viewed_at is >= 5 minutes ago
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user!.id)
        .eq('read', true)
        .not('viewed_at', 'is', null)
        .lte('viewed_at', fiveMinAgo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications', user?.id] });
    },
  });
}

// Keep old exports for backward compatibility
export const useMarkNotificationsRead = useMarkNotificationsViewed;
export const useDeleteReadNotifications = useDeleteViewedNotifications;
