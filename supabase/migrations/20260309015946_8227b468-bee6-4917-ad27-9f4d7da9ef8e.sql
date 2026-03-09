
-- Delete existing LOP rows from leave_balances
DELETE FROM public.leave_balances WHERE leave_type = 'lop';

-- Update initialize_leave_balances to NOT create LOP rows
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

-- Update deduction trigger: CL→EL→ML only, no LOP storage
CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
  _remaining numeric;
  _bal record;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  -- OD is independent: just increment OD used
  IF NEW.leave_type = 'od' THEN
    UPDATE public.leave_balances
    SET used = used + NEW.number_of_days
    WHERE user_id = NEW.user_id AND leave_type = 'od' AND academic_year = _academic_year;
    RETURN NEW;
  END IF;

  -- Cascading deduction: CL → EL → ML (ignore the selected leave type)
  _remaining := NEW.number_of_days;

  FOR _bal IN
    SELECT id, leave_type, opening, used, (opening - used) as avail
    FROM public.leave_balances
    WHERE user_id = NEW.user_id AND academic_year = _academic_year
      AND leave_type IN ('casual', 'earned', 'medical')
    ORDER BY 
      CASE leave_type WHEN 'casual' THEN 1 WHEN 'earned' THEN 2 WHEN 'medical' THEN 3 END
  LOOP
    EXIT WHEN _remaining <= 0;
    
    IF _bal.avail > 0 THEN
      IF _bal.avail >= _remaining THEN
        UPDATE public.leave_balances SET used = used + _remaining WHERE id = _bal.id;
        _remaining := 0;
      ELSE
        UPDATE public.leave_balances SET used = used + _bal.avail WHERE id = _bal.id;
        _remaining := _remaining - _bal.avail;
      END IF;
    END IF;
  END LOOP;

  -- Any remaining days are LOP — NOT stored in DB, calculated dynamically in UI

  RETURN NEW;
END;
$function$;

-- Re-attach triggers
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

CREATE OR REPLACE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
