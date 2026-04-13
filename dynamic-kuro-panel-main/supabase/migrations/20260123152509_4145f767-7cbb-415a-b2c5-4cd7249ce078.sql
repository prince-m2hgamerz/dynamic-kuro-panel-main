-- Create role enum with owner, admin, user
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');

-- Create key status enum
CREATE TYPE public.key_status AS ENUM ('active', 'paused', 'expired', 'revoked');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('active', 'banned', 'suspended');

-- Create game status enum
CREATE TYPE public.game_status AS ENUM ('active', 'inactive', 'maintenance');

-- User roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'user' THEN 3 
    END
  LIMIT 1
$$;

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    telegram_chat_id TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    status user_status DEFAULT 'active',
    invited_by UUID REFERENCES public.profiles(id),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Games table
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mod_name TEXT,
    status game_status DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- License keys table
CREATE TABLE public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT UNIQUE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    duration_hours INTEGER NOT NULL,
    max_devices INTEGER DEFAULT 1,
    price DECIMAL(10, 2) DEFAULT 0.00,
    status key_status DEFAULT 'active',
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Key activations table (HWID tracking)
CREATE TABLE public.key_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    activated_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    UNIQUE (key_id, device_fingerprint)
);

ALTER TABLE public.key_activations ENABLE ROW LEVEL SECURITY;

-- Referral codes table
CREATE TABLE public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    max_uses INTEGER DEFAULT 10,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- User sessions table
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Two factor codes table (for Telegram 2FA)
CREATE TABLE public.two_factor_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Price settings table
CREATE TABLE public.price_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    duration_hours INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (game_id, duration_hours)
);

ALTER TABLE public.price_settings ENABLE ROW LEVEL SECURITY;

-- Server settings table
CREATE TABLE public.server_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.server_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Games policies
CREATE POLICY "Anyone authenticated can view active games"
ON public.games FOR SELECT
TO authenticated
USING (status = 'active' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can manage games"
ON public.games FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- License keys policies
CREATE POLICY "Users can view own keys"
ON public.license_keys FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all keys"
ON public.license_keys FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can create keys"
ON public.license_keys FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own keys"
ON public.license_keys FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all keys"
ON public.license_keys FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Key activations policies
CREATE POLICY "Key owners can view activations"
ON public.key_activations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.license_keys 
    WHERE id = key_activations.key_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins can view all activations"
ON public.key_activations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Referral codes policies
CREATE POLICY "Users can view own referral codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can create referral codes"
ON public.referral_codes FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own referral codes"
ON public.referral_codes FOR DELETE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all referral codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- User sessions policies
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
ON public.user_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Two factor codes policies
CREATE POLICY "Users can view own 2FA codes"
ON public.two_factor_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Price settings policies
CREATE POLICY "Anyone can view prices"
ON public.price_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage prices"
ON public.price_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Server settings policies
CREATE POLICY "Owners can manage server settings"
ON public.server_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Anyone can view server settings"
ON public.server_settings FOR SELECT
TO authenticated
USING (true);

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_license_keys_updated_at
  BEFORE UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_price_settings_updated_at
  BEFORE UPDATE ON public.price_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();