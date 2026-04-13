-- Add bot_id column to price_settings for per-bot pricing
ALTER TABLE public.price_settings
ADD COLUMN bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE CASCADE;

-- Drop old unique constraint
ALTER TABLE public.price_settings DROP CONSTRAINT IF EXISTS price_settings_game_id_duration_hours_key;

-- Add new unique constraint including bot_id
ALTER TABLE public.price_settings ADD CONSTRAINT price_settings_bot_game_duration_key 
  UNIQUE (bot_id, game_id, duration_hours);

-- Create index for faster lookups
CREATE INDEX idx_price_settings_bot_id ON public.price_settings(bot_id);