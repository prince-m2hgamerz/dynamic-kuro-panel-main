-- Drop the old single notification column
ALTER TABLE public.license_keys DROP COLUMN IF EXISTS expiry_notified;

-- Add new columns for each notification tier
ALTER TABLE public.license_keys
ADD COLUMN notified_24h boolean DEFAULT false,
ADD COLUMN notified_6h boolean DEFAULT false,
ADD COLUMN notified_1h boolean DEFAULT false;