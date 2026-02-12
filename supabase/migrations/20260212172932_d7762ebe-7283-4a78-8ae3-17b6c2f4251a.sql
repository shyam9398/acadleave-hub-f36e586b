
-- Add year_of_joining column to profiles
ALTER TABLE public.profiles ADD COLUMN year_of_joining integer;

-- Update handle_new_user to include year_of_joining
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, department_id, year_of_joining)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    (NEW.raw_user_meta_data->>'department_id')::UUID,
    (NEW.raw_user_meta_data->>'year_of_joining')::integer
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  RETURN NEW;
END;
$function$;

-- Update initialize_leave_balances to add special leave type
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _academic_year text;
BEGIN
  IF EXTRACT(MONTH FROM now()) >= 6 THEN
    _academic_year := EXTRACT(YEAR FROM now())::text || '-' || (EXTRACT(YEAR FROM now()) + 1)::text;
  ELSE
    _academic_year := (EXTRACT(YEAR FROM now()) - 1)::text || '-' || EXTRACT(YEAR FROM now())::text;
  END IF;

  INSERT INTO public.leave_balances (user_id, leave_type, opening, used, academic_year)
  VALUES
    (NEW.user_id, 'casual', 12, 0, _academic_year),
    (NEW.user_id, 'medical', 20, 0, _academic_year),
    (NEW.user_id, 'earned', 4, 0, _academic_year),
    (NEW.user_id, 'od', 0, 0, _academic_year),
    (NEW.user_id, 'special', 0, 0, _academic_year)
  ON CONFLICT (user_id, leave_type, academic_year) DO NOTHING;

  RETURN NEW;
END;
$function$;
