-- Add columns to profiles for per-user OTP bot configuration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS otp_bot_token text,
ADD COLUMN IF NOT EXISTS otp_webhook_set boolean DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_requires_otp ON profiles(requires_otp) WHERE requires_otp = true;