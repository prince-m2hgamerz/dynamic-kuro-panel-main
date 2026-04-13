-- Add account expiration field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMP WITH TIME ZONE;

-- Set default expiration for existing users (e.g., 1 year from now for demo)
UPDATE profiles SET account_expires_at = NOW() + INTERVAL '1 year' WHERE account_expires_at IS NULL;