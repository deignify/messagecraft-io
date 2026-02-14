
-- Broadcast campaigns table
CREATE TABLE public.broadcast_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en',
  template_params JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  filter_categories TEXT[] DEFAULT '{}',
  filter_tags TEXT[] DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Broadcast recipients table
CREATE TABLE public.broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  wa_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for broadcast_campaigns
CREATE POLICY "Users can manage own broadcast campaigns"
ON public.broadcast_campaigns FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team members can view workspace broadcasts"
ON public.broadcast_campaigns FOR SELECT
USING (is_team_member(auth.uid(), user_id));

-- RLS policies for broadcast_recipients
CREATE POLICY "Users can manage own broadcast recipients"
ON public.broadcast_recipients FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.broadcast_campaigns bc
  WHERE bc.id = broadcast_recipients.campaign_id AND bc.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.broadcast_campaigns bc
  WHERE bc.id = broadcast_recipients.campaign_id AND bc.user_id = auth.uid()
));

CREATE POLICY "Team members can view workspace broadcast recipients"
ON public.broadcast_recipients FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.broadcast_campaigns bc
  WHERE bc.id = broadcast_recipients.campaign_id AND is_team_member(auth.uid(), bc.user_id)
));

-- Indexes
CREATE INDEX idx_broadcast_campaigns_user ON public.broadcast_campaigns(user_id);
CREATE INDEX idx_broadcast_campaigns_status ON public.broadcast_campaigns(status);
CREATE INDEX idx_broadcast_recipients_campaign ON public.broadcast_recipients(campaign_id);
CREATE INDEX idx_broadcast_recipients_status ON public.broadcast_recipients(status);

-- Updated_at trigger
CREATE TRIGGER update_broadcast_campaigns_updated_at
BEFORE UPDATE ON public.broadcast_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
