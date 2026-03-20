
-- Use DROP IF EXISTS + CREATE to safely re-attach triggers

-- 2. Initialize leave balances when profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

-- 3. Deduct leave balances on approval
DROP TRIGGER IF EXISTS on_leave_approved ON public.leave_requests;
CREATE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

-- 4. Notify on new leave request
DROP TRIGGER IF EXISTS on_new_leave_request ON public.leave_requests;
CREATE TRIGGER on_new_leave_request
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_leave_request();

-- 5. Notify on leave status change
DROP TRIGGER IF EXISTS on_leave_status_change ON public.leave_requests;
CREATE TRIGGER on_leave_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status_change();

-- 6. Update updated_at
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
