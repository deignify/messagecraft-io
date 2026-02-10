
-- Add business settings columns to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS working_hours_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS working_hours_start text DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_hours_end text DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS working_days text[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}',
  ADD COLUMN IF NOT EXISTS auto_reply_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_message text DEFAULT 'Thank you for your message. We will get back to you shortly.',
  ADD COLUMN IF NOT EXISTS outside_hours_message text DEFAULT 'We are currently outside of business hours. We will respond when we are back.';

-- Create storage bucket for template media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-media', 'template-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to template-media bucket
CREATE POLICY "Users can upload template media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'template-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access for template media
CREATE POLICY "Template media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-media');

-- Allow users to delete their own template media
CREATE POLICY "Users can delete own template media"
ON storage.objects FOR DELETE
USING (bucket_id = 'template-media' AND auth.uid()::text = (storage.foldername(name))[1]);
