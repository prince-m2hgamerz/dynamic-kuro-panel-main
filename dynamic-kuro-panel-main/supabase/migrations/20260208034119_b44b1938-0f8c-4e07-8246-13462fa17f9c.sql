-- Add column to profiles to track if user is hidden (ghost status)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Add column to profiles to track if user requires OTP login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requires_otp boolean DEFAULT false;

-- Create index for hidden users for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_hidden ON public.profiles(is_hidden);

-- Create index for OTP users
CREATE INDEX IF NOT EXISTS idx_profiles_requires_otp ON public.profiles(requires_otp);