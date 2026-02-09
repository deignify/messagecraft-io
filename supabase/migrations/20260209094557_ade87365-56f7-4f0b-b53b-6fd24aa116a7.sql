
-- Quick replies / canned responses table
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  shortcut TEXT,
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quick replies"
ON public.quick_replies FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add labels column to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Enable realtime for quick_replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_replies;

-- Trigger for updated_at on quick_replies
CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
