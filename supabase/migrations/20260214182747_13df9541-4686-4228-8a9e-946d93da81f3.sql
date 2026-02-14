
-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmins can view webhook logs
CREATE POLICY "Superadmins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can delete webhook logs
CREATE POLICY "Superadmins can delete webhook logs"
ON public.webhook_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'superadmin'::app_role));
