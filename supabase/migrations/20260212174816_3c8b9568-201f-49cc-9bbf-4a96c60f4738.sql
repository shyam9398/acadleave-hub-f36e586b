-- Drop the old check constraint and replace with one that includes 'special'
ALTER TABLE public.leave_balances DROP CONSTRAINT IF EXISTS leave_balances_leave_type_check;

ALTER TABLE public.leave_balances ADD CONSTRAINT leave_balances_leave_type_check 
  CHECK (leave_type IN ('casual', 'earned', 'medical', 'od', 'special'));