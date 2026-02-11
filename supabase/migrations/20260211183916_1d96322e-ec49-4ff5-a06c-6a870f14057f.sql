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

  -- Casual: 12/year, no carry forward
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES (NEW.user_id, 'casual', 12, 0, _academic_year);

  -- Medical: 20/year, carries forward
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES (NEW.user_id, 'medical', 20, 0, _academic_year);

  -- Earned: 4 base (8 for 3+ years exp, adjustable by admin)
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES (NEW.user_id, 'earned', 4, 0, _academic_year);

  -- OD: starts at 0
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES (NEW.user_id, 'od', 0, 0, _academic_year);

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on profiles
DROP TRIGGER IF EXISTS trg_initialize_leave_balances ON public.profiles;
CREATE TRIGGER trg_initialize_leave_balances
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_leave_balances();