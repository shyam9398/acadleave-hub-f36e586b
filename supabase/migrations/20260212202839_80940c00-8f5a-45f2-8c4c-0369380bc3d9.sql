
-- Table to store verification codes for admin operations
CREATE TABLE public.admin_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_user_id uuid NOT NULL,
  faculty_email text NOT NULL,
  faculty_user_id uuid,
  code text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JR Assistant can manage own codes"
ON public.admin_verification_codes
FOR ALL
USING (has_role(auth.uid(), 'junior_assistant'::app_role) AND assistant_user_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'junior_assistant'::app_role) AND assistant_user_id = auth.uid());

-- Auto-cleanup expired codes
CREATE INDEX idx_admin_codes_expires ON public.admin_verification_codes(expires_at);
