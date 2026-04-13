-- Add icon_url column to games table
ALTER TABLE public.games ADD COLUMN icon_url text DEFAULT NULL;

-- Create 'game-icons' bucket for storing game images
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-icons', 'game-icons', true);

-- Allow owners/admins to upload game icons
CREATE POLICY "Owners and admins can upload game icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'game-icons' 
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow everyone to view icons (public bucket)
CREATE POLICY "Anyone can view game icons"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-icons');

-- Allow owners/admins to update game icons
CREATE POLICY "Owners and admins can update game icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'game-icons'
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow owners/admins to delete game icons
CREATE POLICY "Owners and admins can delete game icons"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'game-icons'
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);