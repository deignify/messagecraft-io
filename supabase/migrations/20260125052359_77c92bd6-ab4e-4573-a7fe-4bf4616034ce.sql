-- Fix RLS on webhook_logs and automation_sessions

-- Enable RLS on webhook_logs (admin-only access pattern)
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- No user policies for webhook_logs - only edge functions will access it

-- Enable RLS on automation_sessions
ALTER TABLE public.automation_sessions ENABLE ROW LEVEL SECURITY;

-- Add policy for automation_sessions
CREATE POLICY "Users can view own automation sessions" ON public.automation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own automation sessions" ON public.automation_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.user_id = auth.uid()
    )
  );