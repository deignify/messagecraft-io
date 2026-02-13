
-- Add account_type column to distinguish between Cloud API and Business App connections
ALTER TABLE public.whatsapp_numbers 
ADD COLUMN account_type text NOT NULL DEFAULT 'cloud_api';

-- Add comment for clarity
COMMENT ON COLUMN public.whatsapp_numbers.account_type IS 'Type of WhatsApp account: cloud_api (WhatsApp Cloud API) or business_app (WhatsApp Business App via Embedded Signup)';
