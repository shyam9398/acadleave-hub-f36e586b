
-- Step 1: Add viewed_at column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS viewed_at timestamptz DEFAULT NULL;

-- Step 2: Update notify_new_leave_request to also notify HOD when faculty submits a pending request
CREATE OR REPLACE FUNCTION public.notify_new_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _applicant_name text;
  _applicant_dept text;
  _applicant_dept_id uuid;
  _principal_id uuid;
  _hod_id uuid;
  _message text;
BEGIN
  -- Get applicant info
  SELECT full_name, department_id INTO _applicant_name, _applicant_dept_id 
  FROM profiles WHERE user_id = NEW.user_id;
  
  IF _applicant_dept_id IS NOT NULL THEN
    SELECT name INTO _applicant_dept FROM departments WHERE id = _applicant_dept_id;
  END IF;

  -- When faculty submits (status = 'pending'), notify HOD of same department
  IF NEW.status = 'pending' THEN
    FOR _hod_id IN
      SELECT ur.user_id FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'hod' AND p.department_id = _applicant_dept_id
    LOOP
      _message := COALESCE(_applicant_name, 'A faculty') || ' (' || COALESCE(_applicant_dept, 'Unknown Dept') || ') has applied for ' || NEW.leave_type || ' leave (' || NEW.from_date || ' to ' || NEW.to_date || ').';
      INSERT INTO public.notifications (user_id, message, type) VALUES (_hod_id, _message, 'warning');
    END LOOP;
  END IF;

  -- When HOD self-applies (status = 'forwarded'), notify Principal
  IF NEW.status = 'forwarded' THEN
    FOR _principal_id IN 
      SELECT user_id FROM public.user_roles WHERE role = 'principal'
    LOOP
      _message := COALESCE(_applicant_name, 'HOD') || ' (' || COALESCE(_applicant_dept, 'Unknown Dept') || ') has applied for ' || NEW.leave_type || ' leave (' || NEW.from_date || ' to ' || NEW.to_date || ') - requires your approval.';
      INSERT INTO public.notifications (user_id, message, type) VALUES (_principal_id, _message, 'warning');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 3: Recreate the trigger for new leave requests
DROP TRIGGER IF EXISTS trg_notify_new_leave ON public.leave_requests;
CREATE TRIGGER trg_notify_new_leave
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_leave_request();
