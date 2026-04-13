-- Create telegram_bots table for multiple bot management
CREATE TABLE public.telegram_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bot_token text NOT NULL,
  admin_chat_id bigint NOT NULL,
  upi_id text NOT NULL,
  upi_name text NOT NULL,
  webhook_url text,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;

-- Only owner can manage bots
CREATE POLICY "Owner can manage bots" ON public.telegram_bots
  FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_telegram_bots_updated_at
  BEFORE UPDATE ON public.telegram_bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();