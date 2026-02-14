
-- Mobile Shop configuration table
CREATE TABLE public.mobile_shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_phone TEXT,
  language TEXT NOT NULL DEFAULT 'hinglish',
  welcome_message TEXT DEFAULT 'Welcome to our mobile shop! 🙏\n\nKya aap naya mobile dekh rahe hai, second hand, ya aapko koi brand ya model final ho to uske baare me btaye?',
  advance_amount_min NUMERIC DEFAULT 1000,
  advance_amount_max NUMERIC DEFAULT 2000,
  upi_id TEXT,
  qr_code_url TEXT,
  google_sheet_id TEXT,
  agent_notify_phone TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(whatsapp_number_id)
);

-- Mobile shop branches table
CREATE TABLE public.mobile_shop_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.mobile_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  contact_phone TEXT,
  upi_id TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_shop_branches ENABLE ROW LEVEL SECURITY;

-- RLS policies for mobile_shops
CREATE POLICY "Users can manage own mobile shops"
ON public.mobile_shops FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for branches
CREATE POLICY "Users can manage own shop branches"
ON public.mobile_shop_branches FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.mobile_shops s
  WHERE s.id = mobile_shop_branches.shop_id AND s.user_id = auth.uid()
));

-- Updated_at trigger
CREATE TRIGGER update_mobile_shops_updated_at
BEFORE UPDATE ON public.mobile_shops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
