
-- Step 1: Drop both triggers to eliminate any duplicate (defensive)
DROP TRIGGER IF EXISTS trg_deduct_leave_on_approval ON public.leave_requests;
DROP TRIGGER IF EXISTS on_leave_approved ON public.leave_requests;

-- Step 2: Ensure the deduction function uses correct incremental logic (CL → EL → ML)
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
  -- Only fire when status changes TO 'approved'
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Determine current academic year (June–May cycle)
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  -- OD is independent: just increment OD used, no cascading
  IF NEW.leave_type = 'od' THEN
    UPDATE public.leave_balances
    SET used = used + NEW.number_of_days
    WHERE user_id = NEW.user_id
      AND leave_type = 'od'
      AND academic_year = _academic_year;
    RETURN NEW;
  END IF;

  -- Cascading deduction: CL → EL → ML (ignore the selected leave type)
  _remaining := NEW.number_of_days;

  FOR _bal IN
    SELECT id, leave_type, opening, used
    FROM public.leave_balances
    WHERE user_id = NEW.user_id
      AND academic_year = _academic_year
      AND leave_type IN ('casual', 'earned', 'medical')
    ORDER BY
      CASE leave_type
        WHEN 'casual'  THEN 1
        WHEN 'earned'  THEN 2
        WHEN 'medical' THEN 3
      END
  LOOP
    EXIT WHEN _remaining <= 0;

    -- Calculate currently available for this leave type
    _avail := _bal.opening - _bal.used;

    IF _avail > 0 THEN
      IF _avail >= _remaining THEN
        -- This balance covers the rest
        UPDATE public.leave_balances
          SET used = used + _remaining
          WHERE id = _bal.id;
        _remaining := 0;
      ELSE
        -- Use all available from this type, carry remainder forward
        UPDATE public.leave_balances
          SET used = used + _avail
          WHERE id = _bal.id;
        _remaining := _remaining - _avail;
      END IF;
    END IF;
  END LOOP;

  -- Any remaining days are LOP — NOT stored in DB, calculated dynamically in UI

  RETURN NEW;
END;
$function$;

-- Step 3: Re-create a single AFTER UPDATE trigger
CREATE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

-- Step 4: Reset corrupted used values to 0 for a clean state
UPDATE public.leave_balances
SET used = 0
WHERE leave_type IN ('casual', 'earned', 'medical', 'od');
