
-- Update notification trigger to also notify Principal when HOD forwards/applies, and notify HOD when Principal approves their leave
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _message text;
  _type text;
  _approver_name text;
  _applicant_name text;
  _applicant_dept text;
  _principal_id uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get approver name
  SELECT full_name INTO _approver_name 
  FROM profiles WHERE user_id = NEW.approved_by;

  -- Get applicant name
  SELECT full_name INTO _applicant_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Get applicant department name
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO _applicant_dept
    FROM departments WHERE id = NEW.department_id;
  END IF;

  -- Notify the leave applicant about status changes
  IF NEW.status = 'approved' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been approved by ' || COALESCE(_approver_name, 'admin') || '.';
    _type := 'success';
    INSERT INTO public.notifications (user_id, message, type) VALUES (NEW.user_id, _message, _type);
  ELSIF NEW.status = 'rejected' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been rejected by ' || COALESCE(_approver_name, 'admin') || '.';
    _type := 'error';
    INSERT INTO public.notifications (user_id, message, type) VALUES (NEW.user_id, _message, _type);
  ELSIF NEW.status = 'forwarded' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been forwarded to the Principal by ' || COALESCE(_approver_name, 'HOD') || '.';
    _type := 'info';
    INSERT INTO public.notifications (user_id, message, type) VALUES (NEW.user_id, _message, _type);

    -- Also notify all Principals about forwarded request
    FOR _principal_id IN 
      SELECT user_id FROM public.user_roles WHERE role = 'principal'
    LOOP
      _message := COALESCE(_applicant_name, 'A faculty') || ' (' || COALESCE(_applicant_dept, 'Unknown Dept') || ') has a ' || NEW.leave_type || ' leave request forwarded for your approval (' || NEW.from_date || ' to ' || NEW.to_date || ').';
      INSERT INTO public.notifications (user_id, message, type) VALUES (_principal_id, _message, 'warning');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Also create a trigger for new leave requests to notify Principal when HOD applies (status starts as 'forwarded')
CREATE OR REPLACE FUNCTION public.notify_new_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _applicant_name text;
  _applicant_dept text;
  _principal_id uuid;
  _message text;
BEGIN
  -- Only notify Principal when a new request is created with 'forwarded' status (HOD self-apply)
  IF NEW.status = 'forwarded' THEN
    SELECT full_name INTO _applicant_name FROM profiles WHERE user_id = NEW.user_id;
    IF NEW.department_id IS NOT NULL THEN
      SELECT name INTO _applicant_dept FROM departments WHERE id = NEW.department_id;
    END IF;

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

-- Add trigger for new leave requests
DROP TRIGGER IF EXISTS trigger_notify_new_leave_request ON public.leave_requests;
CREATE TRIGGER trigger_notify_new_leave_request
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_leave_request();
