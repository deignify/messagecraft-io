
-- Add new columns to contacts table for advanced filtering
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS "group" text;
