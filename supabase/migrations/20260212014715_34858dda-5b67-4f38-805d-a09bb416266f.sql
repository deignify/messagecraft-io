
-- Create CTWA campaigns table
CREATE TABLE public.ctwa_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  whatsapp_number_id uuid NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  objective text NOT NULL DEFAULT 'OUTCOME_ENGAGEMENT',
  daily_budget numeric,
  total_budget numeric,
  platform text NOT NULL DEFAULT 'both',
  ad_text text,
  pre_filled_message text DEFAULT 'Hi, I''m interested!',
  deep_link text,
  targeting jsonb DEFAULT '{}'::jsonb,
  leads integer DEFAULT 0,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  spend numeric DEFAULT 0,
  cost_per_lead numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ctwa_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ctwa campaigns"
ON public.ctwa_campaigns FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team members can view workspace ctwa campaigns"
ON public.ctwa_campaigns FOR SELECT
USING (is_team_member(auth.uid(), user_id));

-- Trigger for updated_at
CREATE TRIGGER update_ctwa_campaigns_updated_at
BEFORE UPDATE ON public.ctwa_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
