-- Add ID documents column to hotel_bookings
ALTER TABLE public.hotel_bookings 
ADD COLUMN IF NOT EXISTS id_documents text[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.hotel_bookings.id_documents IS 'Array of URLs to guest ID document uploads (images/PDFs)';

-- Create storage bucket for guest ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-ids', 
  'guest-ids', 
  false,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for guest-ids bucket
-- Allow authenticated users to upload
CREATE POLICY "Hotel owners can upload guest IDs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'guest-ids' 
  AND auth.role() = 'authenticated'
);

-- Allow hotel owners to view their guest IDs
CREATE POLICY "Hotel owners can view guest IDs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'guest-ids'
  AND auth.role() = 'authenticated'
);

-- Allow hotel owners to delete guest IDs
CREATE POLICY "Hotel owners can delete guest IDs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'guest-ids'
  AND auth.role() = 'authenticated'
);