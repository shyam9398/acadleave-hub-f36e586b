-- Fix 1: Restrict get_user_id_by_email to junior_assistant role only
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow junior assistants to call this function
  IF NOT has_role(auth.uid(), 'junior_assistant') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  RETURN (SELECT id FROM auth.users WHERE email = _email LIMIT 1);
END;
$$;

-- Fix 2: Restrict HOD profile access to their own department
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view authorized profiles" ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'junior_assistant')
  OR (
    public.has_role(auth.uid(), 'hod')
    AND department_id IN (
      SELECT p.department_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
);