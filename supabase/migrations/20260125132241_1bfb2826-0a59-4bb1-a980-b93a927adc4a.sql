-- Create enum for template category
CREATE TYPE public.custom_template_category AS ENUM ('marketing', 'utility', 'authentication');

-- Create enum for template status
CREATE TYPE public.custom_template_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- Create enum for header type
CREATE TYPE public.template_header_type AS ENUM ('none', 'text', 'image', 'video', 'document');

-- Create message_templates table
CREATE TABLE public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    category custom_template_category NOT NULL DEFAULT 'utility',
    language TEXT NOT NULL DEFAULT 'en',
    status custom_template_status NOT NULL DEFAULT 'draft',
    header_type template_header_type NOT NULL DEFAULT 'none',
    header_text TEXT,
    header_media_url TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    variables JSONB DEFAULT '{}',
    buttons JSONB DEFAULT '[]',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_template_name_per_user UNIQUE (user_id, whatsapp_number_id, template_name)
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own templates"
ON public.message_templates
FOR SELECT
USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can create own templates"
ON public.message_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.message_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.message_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX idx_message_templates_whatsapp_number_id ON public.message_templates(whatsapp_number_id);
CREATE INDEX idx_message_templates_status ON public.message_templates(status);