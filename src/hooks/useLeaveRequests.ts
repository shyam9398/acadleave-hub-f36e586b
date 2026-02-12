import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface LeaveRequestRow {
  id: string;
  user_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason: string;
  status: string;
  is_half_day: boolean;
  assigned_faculty: string | null;
  approved_by: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  faculty_name?: string;
  department_name?: string;
}

export function useMyLeaveRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-leave-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequestRow[];
    },
  });
}

export function useDepartmentLeaveRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dept-leave-requests', user?.departmentId],
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

export function useAllLeaveRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-leave-requests'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequestRow[];
    },
  });
}

export function useForwardedAndOdRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['forwarded-od-requests'],
    enabled: !!user,
    queryFn: async () => {
      // Principal sees forwarded requests and OD requests that have been forwarded
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .or('status.eq.forwarded')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequestRow[];
    },
  });
}

export function useSubmitLeaveRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      leave_type: string;
      from_date: string;
      to_date: string;
      number_of_days: number;
      reason: string;
      is_half_day: boolean;
      assigned_faculty: string;
    }) => {
      // If HOD applies leave, set status to 'forwarded' so it goes directly to Principal
      const isHod = user!.role === 'hod' as string;
      const status = isHod ? 'forwarded' : 'pending';

      const { error } = await supabase.from('leave_requests').insert({
        user_id: user!.id,
        department_id: user!.departmentId,
        leave_type: params.leave_type,
        from_date: params.from_date,
        to_date: params.to_date,
        number_of_days: params.number_of_days,
        reason: params.reason,
        is_half_day: params.is_half_day,
        assigned_faculty: params.assigned_faculty || null,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Leave Applied Successfully', description: 'Your request has been submitted.' });
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLeaveStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, approved_by: user!.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      toast({ title: `Leave ${label}`, description: `Request has been ${status}.` });
      queryClient.invalidateQueries({ queryKey: ['dept-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['forwarded-od-requests'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}
