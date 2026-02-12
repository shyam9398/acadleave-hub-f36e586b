
-- Allow junior_assistant to update leave_balances (for Admin quota management)
DROP POLICY IF EXISTS "No manual leave_balance update" ON public.leave_balances;
CREATE POLICY "Junior assistant can update balances"
ON public.leave_balances
FOR UPDATE
USING (has_role(auth.uid(), 'junior_assistant'::app_role));

-- Replace simple deduction with cascading CL → EL → ML logic + LOP
CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
  _remaining numeric;
  _days numeric;
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

  -- For OD and special leaves, just increment used directly
  IF NEW.leave_type IN ('od', 'special') THEN
    UPDATE public.leave_balances
    SET used = used + NEW.number_of_days
    WHERE user_id = NEW.user_id AND leave_type = NEW.leave_type AND academic_year = _academic_year;
    RETURN NEW;
  END IF;

  -- Cascading deduction: CL → EL → ML
  _remaining := NEW.number_of_days;

  FOR _bal IN
    SELECT id, leave_type, opening, used, COALESCE(available, opening - used) as avail
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

  -- If still remaining, apply LOP to the original leave type (negative available)
  IF _remaining > 0 THEN
    UPDATE public.leave_balances
    SET used = used + _remaining
    WHERE user_id = NEW.user_id AND leave_type = NEW.leave_type AND academic_year = _academic_year;
  END IF;

  RETURN NEW;
END;
$function$;
