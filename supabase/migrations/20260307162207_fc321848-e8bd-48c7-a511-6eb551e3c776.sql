
-- Fix initialize_leave_balances to always set EL opening = 4
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
BEGIN
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES
    (NEW.user_id, 'casual', 12, 0, _academic_year),
    (NEW.user_id, 'medical', 20, 0, _academic_year),
    (NEW.user_id, 'earned', 4, 0, _academic_year),
    (NEW.user_id, 'od', 0, 0, _academic_year)
  ON CONFLICT (user_id, leave_type, academic_year) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Re-attach all triggers (in case they're missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

CREATE OR REPLACE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

CREATE OR REPLACE TRIGGER on_new_leave_request
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_leave_request();

CREATE OR REPLACE TRIGGER on_leave_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status_change();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
