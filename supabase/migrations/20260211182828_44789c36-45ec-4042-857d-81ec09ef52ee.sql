
-- 1. Create function to initialize leave balances when a new user signs up
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _academic_year text;
BEGIN
  -- Determine academic year (June to May cycle)
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  -- Insert casual leave balance (12 per year, no carry forward)
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, available, academic_year)
  VALUES (NEW.user_id, 'casual', 12, 0, 12, _academic_year);

  -- Insert medical leave balance (20 per year, carries forward)
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, available, academic_year)
  VALUES (NEW.user_id, 'medical', 20, 0, 20, _academic_year);

  -- Insert earned leave balance (4 per year for <3 years exp, 8 for >=3 years; carries forward)
  -- Default to 4 for new users (can be updated by admin)
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, available, academic_year)
  VALUES (NEW.user_id, 'earned', 4, 0, 4, _academic_year);

  -- Insert OD balance (starts at 0, no opening balance)
  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, available, academic_year)
  VALUES (NEW.user_id, 'od', 0, 0, 0, _academic_year);

  RETURN NEW;
END;
$$;

-- 2. Create trigger on profiles table (fired after handle_new_user creates the profile)
CREATE TRIGGER initialize_leave_balances_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_leave_balances();

-- 3. Allow leave_balances to be inserted by the system trigger (security definer handles this)
-- But also allow HOD to view their department balances
CREATE POLICY "HOD can view dept balances"
ON public.leave_balances
FOR SELECT
USING (
  has_role(auth.uid(), 'hod'::app_role) AND 
  user_id IN (
    SELECT p.user_id FROM profiles p 
    WHERE p.department_id IN (
      SELECT p2.department_id FROM profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);

-- 4. Allow notifications to be inserted by authenticated users (for system notifications via edge function)
-- We'll use a service-role edge function instead, so let's allow insert for the notification trigger
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- 5. Create a trigger to send notifications when leave request status changes
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _message text;
  _type text;
  _approver_name text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get approver name
  SELECT full_name INTO _approver_name 
  FROM profiles WHERE user_id = NEW.approved_by;

  IF NEW.status = 'approved' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been approved by ' || COALESCE(_approver_name, 'admin') || '.';
    _type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been rejected by ' || COALESCE(_approver_name, 'admin') || '.';
    _type := 'error';
  ELSIF NEW.status = 'forwarded' THEN
    _message := 'Your ' || NEW.leave_type || ' leave request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been forwarded to the Principal by ' || COALESCE(_approver_name, 'HOD') || '.';
    _type := 'info';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (NEW.user_id, _message, _type);

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_leave_status_change_trigger
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_status_change();
