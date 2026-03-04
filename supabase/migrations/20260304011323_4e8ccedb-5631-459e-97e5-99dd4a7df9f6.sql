
-- Drop and recreate all triggers safely

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_leave_balances();

DROP TRIGGER IF EXISTS on_leave_request_created ON public.leave_requests;
CREATE TRIGGER on_leave_request_created
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_leave_request();

DROP TRIGGER IF EXISTS on_leave_status_change ON public.leave_requests;
CREATE TRIGGER on_leave_status_change
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_status_change();

DROP TRIGGER IF EXISTS on_leave_approved ON public.leave_requests;
CREATE TRIGGER on_leave_approved
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
