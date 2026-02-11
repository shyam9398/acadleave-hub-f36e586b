
CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
BEGIN
  -- Only fire when status changes to 'approved'
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Determine academic year
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  -- Update used column; available is a generated column (opening - used)
  UPDATE public.leave_balances
  SET used = used + NEW.number_of_days
  WHERE user_id = NEW.user_id
    AND leave_type = NEW.leave_type
    AND academic_year = _academic_year;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_deduct_leave_on_approval
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_leave_balance_on_approval();
