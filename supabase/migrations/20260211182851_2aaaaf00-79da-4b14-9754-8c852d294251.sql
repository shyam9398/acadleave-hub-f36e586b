
-- Fix the overly permissive notifications insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- The notify_leave_status_change trigger uses SECURITY DEFINER so it bypasses RLS.
-- We don't need a public insert policy. If we need user-created notifications later,
-- we'll add a scoped policy. For now, no INSERT policy needed.
