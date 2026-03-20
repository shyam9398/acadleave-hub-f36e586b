
-- Fix: Allow used to exceed opening on ML so LOP days are visible.
-- After CL and EL are exhausted, ALL remaining days go to ML's used column.
CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
  _remaining numeric;
  _avail numeric;
  _bal record;
  _ml_id uuid;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  -- OD is independent
  IF NEW.leave_type = 'od' THEN
    UPDATE public.leave_balances
    SET used = used + NEW.number_of_days
    WHERE user_id = NEW.user_id AND leave_type = 'od' AND academic_year = _academic_year;
    RETURN NEW;
  END IF;

  _remaining := NEW.number_of_days;

  -- Deduct CL first
  FOR _bal IN
    SELECT id, leave_type, opening, used
    FROM public.leave_balances
    WHERE user_id = NEW.user_id AND academic_year = _academic_year
      AND leave_type IN ('casual', 'earned')
    ORDER BY CASE leave_type WHEN 'casual' THEN 1 WHEN 'earned' THEN 2 END
  LOOP
    EXIT WHEN _remaining <= 0;
    _avail := _bal.opening - _bal.used;
    IF _avail > 0 THEN
      IF _avail >= _remaining THEN
        UPDATE public.leave_balances SET used = used + _remaining WHERE id = _bal.id;
        _remaining := 0;
      ELSE
        UPDATE public.leave_balances SET used = used + _avail WHERE id = _bal.id;
        _remaining := _remaining - _avail;
      END IF;
    END IF;
  END LOOP;

  -- For ML: deduct available first, then any excess (LOP) also goes to ML used
  IF _remaining > 0 THEN
    SELECT id INTO _ml_id
    FROM public.leave_balances
    WHERE user_id = NEW.user_id AND leave_type = 'medical' AND academic_year = _academic_year;

    IF _ml_id IS NOT NULL THEN
      -- Add ALL remaining days to ML used (even if it exceeds opening)
      UPDATE public.leave_balances SET used = used + _remaining WHERE id = _ml_id;
      _remaining := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
