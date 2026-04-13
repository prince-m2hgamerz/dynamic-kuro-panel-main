-- Create songs table for background music
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_owner_song BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Only one owner song can be active at a time, admin/reseller can have their own
-- Owners can see all songs
CREATE POLICY "Owners can view all songs"
ON public.songs
FOR SELECT
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'co_owner'));

-- Admins can view songs
CREATE POLICY "Admins can view songs"
ON public.songs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Resellers can view songs
CREATE POLICY "Resellers can view songs"
ON public.songs
FOR SELECT
USING (public.has_role(auth.uid(), 'reseller'));

-- Everyone can view active songs (for playing)
CREATE POLICY "Everyone can view active songs"
ON public.songs
FOR SELECT
USING (is_active = true);

-- Owners can insert songs
CREATE POLICY "Owners can insert songs"
ON public.songs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'co_owner'));

-- Admins can insert their own songs
CREATE POLICY "Admins can insert their songs"
ON public.songs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Resellers can insert their own songs
CREATE POLICY "Resellers can insert their songs"
ON public.songs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'reseller') AND created_by = auth.uid());

-- Owners can update all songs
CREATE POLICY "Owners can update songs"
ON public.songs
FOR UPDATE
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'co_owner'));

-- Admins can update their own songs
CREATE POLICY "Admins can update their songs"
ON public.songs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Resellers can update their own songs
CREATE POLICY "Resellers can update their songs"
ON public.songs
FOR UPDATE
USING (public.has_role(auth.uid(), 'reseller') AND created_by = auth.uid());

-- Owners can delete songs
CREATE POLICY "Owners can delete songs"
ON public.songs
FOR DELETE
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'co_owner'));

-- Create storage bucket for songs
INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true);

-- Storage policies for songs bucket
CREATE POLICY "Anyone can view songs files"
ON storage.objects FOR SELECT
USING (bucket_id = 'songs');

CREATE POLICY "Authenticated users can upload songs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'songs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own songs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own songs"
ON storage.objects FOR DELETE
USING (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);