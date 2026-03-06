
-- 1. Create security definer function to get department_id without RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. Fix recursive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view authorized profiles" ON public.profiles;
CREATE POLICY "Users can view authorized profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'principal'::app_role)
    OR has_role(auth.uid(), 'junior_assistant'::app_role)
    OR (has_role(auth.uid(), 'hod'::app_role) AND department_id = get_my_department_id())
  );

-- 3. Fix recursive leave_balances HOD SELECT policy
DROP POLICY IF EXISTS "HOD can view dept balances" ON public.leave_balances;
CREATE POLICY "HOD can view dept balances" ON public.leave_balances
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'hod'::app_role)
    AND user_id IN (
      SELECT p.user_id FROM profiles p WHERE p.department_id = get_my_department_id()
    )
  );

-- 4. Fix recursive leave_requests HOD policies
DROP POLICY IF EXISTS "HOD can view dept requests" ON public.leave_requests;
CREATE POLICY "HOD can view dept requests" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'hod'::app_role) AND department_id = get_my_department_id());

DROP POLICY IF EXISTS "HOD can update dept requests" ON public.leave_requests;
CREATE POLICY "HOD can update dept requests" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'hod'::app_role) AND department_id = get_my_department_id());

-- 5. Fix recursive leave_audit_logs HOD policy
DROP POLICY IF EXISTS "HOD can view dept audit logs" ON public.leave_audit_logs;
CREATE POLICY "HOD can view dept audit logs" ON public.leave_audit_logs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'hod'::app_role)
    AND faculty_id IN (
      SELECT p.user_id FROM profiles p WHERE p.department_id = get_my_department_id()
    )
  );

-- 6. Re-attach all missing triggers
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

CREATE OR REPLACE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

CREATE OR REPLACE TRIGGER on_new_leave_request
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_leave_request();

CREATE OR REPLACE TRIGGER on_leave_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status_change();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
