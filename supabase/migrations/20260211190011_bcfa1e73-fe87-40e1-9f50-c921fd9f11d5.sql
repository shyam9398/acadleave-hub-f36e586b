
-- Restrict profiles SELECT to own profile + HOD/principal can see department members
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'hod')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'junior_assistant')
);

-- Prevent profile deletion
CREATE POLICY "No profile deletion" ON public.profiles FOR DELETE USING (false);

-- Protect departments from writes
CREATE POLICY "No department insert" ON public.departments FOR INSERT WITH CHECK (false);
CREATE POLICY "No department update" ON public.departments FOR UPDATE USING (false);
CREATE POLICY "No department delete" ON public.departments FOR DELETE USING (false);

-- Protect user_roles from writes (only trigger creates them)
CREATE POLICY "No role insert" ON public.user_roles FOR INSERT WITH CHECK (false);
CREATE POLICY "No role update" ON public.user_roles FOR UPDATE USING (false);
CREATE POLICY "No role delete" ON public.user_roles FOR DELETE USING (false);

-- Protect leave_balances from unauthorized writes (trigger handles inserts)
CREATE POLICY "No manual leave_balance insert" ON public.leave_balances FOR INSERT WITH CHECK (false);
CREATE POLICY "No manual leave_balance update" ON public.leave_balances FOR UPDATE USING (false);
CREATE POLICY "No manual leave_balance delete" ON public.leave_balances FOR DELETE USING (false);

-- Notifications: only system creates, users can delete own
CREATE POLICY "No manual notification insert" ON public.notifications FOR INSERT WITH CHECK (false);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Prevent leave request deletion (preserve audit trail)
CREATE POLICY "No leave request deletion" ON public.leave_requests FOR DELETE USING (false);
