-- Create table for storing owner OTP codes
CREATE TABLE public.owner_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owner_otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update (edge function will use service role)
-- Users can only view their own OTP codes (for verification)
CREATE POLICY "Users can view own OTP codes"
ON public.owner_otp_codes
FOR SELECT
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_owner_otp_codes_user_id ON public.owner_otp_codes(user_id);
CREATE INDEX idx_owner_otp_codes_expires_at ON public.owner_otp_codes(expires_at);