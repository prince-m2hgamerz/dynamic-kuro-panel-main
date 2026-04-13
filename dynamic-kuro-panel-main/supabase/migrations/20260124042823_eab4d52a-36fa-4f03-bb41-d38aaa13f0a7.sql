-- Add initial_balance column to referral_codes table
ALTER TABLE public.referral_codes ADD COLUMN initial_balance numeric DEFAULT 0;