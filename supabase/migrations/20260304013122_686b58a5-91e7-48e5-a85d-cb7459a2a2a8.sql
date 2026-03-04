
-- 1. Create leave_audit_logs table
CREATE TABLE IF NOT EXISTS public.leave_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL,
  edited_by uuid NOT NULL,
  leave_type text NOT NULL,
  previous_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.leave_audit_logs
FOR SELECT USING (
  has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'junior_assistant'::app_role)
);

CREATE POLICY "HOD can view dept audit logs" ON public.leave_audit_logs
FOR SELECT USING (
  has_role(auth.uid(), 'hod'::app_role) AND faculty_id IN (
    SELECT p.user_id FROM profiles p WHERE p.department_id IN (
      SELECT p2.department_id FROM profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);

CREATE POLICY "No manual audit delete" ON public.leave_audit_logs
FOR DELETE USING (false);

CREATE POLICY "No manual audit update" ON public.leave_audit_logs
FOR UPDATE USING (false);

CREATE POLICY "Jr assistant can insert audit logs" ON public.leave_audit_logs
FOR INSERT WITH CHECK (has_role(auth.uid(), 'junior_assistant'::app_role));

-- 2. Recreate all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

DROP TRIGGER IF EXISTS on_leave_request_created ON public.leave_requests;
CREATE TRIGGER on_leave_request_created
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_leave_request();

DROP TRIGGER IF EXISTS on_leave_status_change ON public.leave_requests;
CREATE TRIGGER on_leave_status_change
AFTER UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status_change();

DROP TRIGGER IF EXISTS on_leave_approved ON public.leave_requests;
CREATE TRIGGER on_leave_approved
AFTER UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Update initialize_leave_balances to use experience-based EL (8 if >=3 years, 0 otherwise)
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _academic_year text;
  _el_opening numeric;
  _yoj integer;
  _current_year integer;
BEGIN
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  _yoj := NEW.year_of_joining;
  _current_year := EXTRACT(YEAR FROM now())::integer;

  IF _yoj IS NOT NULL AND (_current_year - _yoj) >= 3 THEN
    _el_opening := 8;
  ELSE
    _el_opening := 0;
  END IF;

  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES
    (NEW.user_id, 'casual', 12, 0, _academic_year),
    (NEW.user_id, 'medical', 20, 0, _academic_year),
    (NEW.user_id, 'earned', _el_opening, 0, _academic_year),
    (NEW.user_id, 'od', 0, 0, _academic_year),
    (NEW.user_id, 'special', 0, 0, _academic_year)
  ON CONFLICT (user_id, leave_type, academic_year) DO NOTHING;

  RETURN NEW;
END;
$$;
