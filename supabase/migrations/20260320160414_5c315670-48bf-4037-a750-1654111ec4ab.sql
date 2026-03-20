-- Remove duplicate triggers for notify_leave_status_change (keep one: on_leave_status_change)
DROP TRIGGER IF EXISTS notify_leave_status_change_trigger ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_notify_leave_status ON public.leave_requests;

-- Remove duplicate triggers for notify_new_leave_request (keep one: on_leave_request_created)
DROP TRIGGER IF EXISTS on_new_leave_request ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_notify_new_leave ON public.leave_requests;
DROP TRIGGER IF EXISTS trigger_notify_new_leave_request ON public.leave_requests;