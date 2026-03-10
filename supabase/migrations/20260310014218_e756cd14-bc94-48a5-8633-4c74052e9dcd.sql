
-- First ensure unique constraint exists for upsert
ALTER TABLE public.leave_balances ADD CONSTRAINT leave_balances_user_type_year_unique UNIQUE (user_id, leave_type, academic_year);

-- Update trigger to store LOP
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
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  IF NEW.leave_type = 'od' THEN
    UPDATE public.leave_balances
    SET used = used + NEW.number_of_days
    WHERE user_id = NEW.user_id AND leave_type = 'od' AND academic_year = _academic_year;
    RETURN NEW;
  END IF;

  _remaining := NEW.number_of_days;

  FOR _bal IN
    SELECT id, leave_type, opening, used
    FROM public.leave_balances
    WHERE user_id = NEW.user_id AND academic_year = _academic_year
      AND leave_type IN ('casual', 'earned', 'medical')
    ORDER BY CASE leave_type WHEN 'casual' THEN 1 WHEN 'earned' THEN 2 WHEN 'medical' THEN 3 END
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

  IF _remaining > 0 THEN
    INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
    VALUES (NEW.user_id, 'lop', 0, _remaining, _academic_year)
    ON CONFLICT ON CONSTRAINT leave_balances_user_type_year_unique
    DO UPDATE SET used = leave_balances.used + _remaining;
  END IF;

  RETURN NEW;
END;
$function$;
