-- Add a guard flag so referral usage is applied exactly once per user
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_applied boolean NOT NULL DEFAULT false;

-- Backfill nulls (safety)
UPDATE public.profiles SET referral_applied = false WHERE referral_applied IS NULL;