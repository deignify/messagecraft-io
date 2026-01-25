-- ═══════════════════════════════════════════════════════
-- WHATSAPP CLOUD API SAAS - COMPLETE DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════
-- USER PROFILES
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════
-- WHATSAPP NUMBERS (Connected via Meta OAuth)
-- ═══════════════════════════════════════════════════════
CREATE TYPE whatsapp_status AS ENUM ('active', 'pending', 'disconnected', 'error');

CREATE TABLE public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status whatsapp_status DEFAULT 'pending' NOT NULL,
  business_name TEXT,
  quality_rating TEXT,
  messaging_limit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own numbers" ON public.whatsapp_numbers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own numbers" ON public.whatsapp_numbers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own numbers" ON public.whatsapp_numbers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own numbers" ON public.whatsapp_numbers
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_whatsapp_numbers_user ON public.whatsapp_numbers(user_id);
CREATE INDEX idx_whatsapp_numbers_phone_id ON public.whatsapp_numbers(phone_number_id);

-- ═══════════════════════════════════════════════════════
-- CONTACTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(whatsapp_number_id, phone)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_contacts_user ON public.contacts(user_id);
CREATE INDEX idx_contacts_whatsapp ON public.contacts(whatsapp_number_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

-- ═══════════════════════════════════════════════════════
-- CONVERSATIONS
-- ═══════════════════════════════════════════════════════
CREATE TYPE conversation_status AS ENUM ('open', 'closed', 'pending');

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status conversation_status DEFAULT 'open' NOT NULL,
  unread_count INT DEFAULT 0 NOT NULL,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(whatsapp_number_id, contact_phone)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_conversations_user ON public.conversations(user_id);
CREATE INDEX idx_conversations_whatsapp ON public.conversations(whatsapp_number_id);

-- ═══════════════════════════════════════════════════════
-- MESSAGES (Real-time enabled)
-- ═══════════════════════════════════════════════════════
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'audio', 'document', 'template', 'interactive', 'location', 'sticker');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  wa_message_id TEXT UNIQUE,
  direction message_direction NOT NULL,
  type message_type DEFAULT 'text' NOT NULL,
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  template_name TEXT,
  template_params JSONB,
  status message_status DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_wa_id ON public.messages(wa_message_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ═══════════════════════════════════════════════════════
-- TEMPLATES (Cached from Meta API)
-- ═══════════════════════════════════════════════════════
CREATE TYPE template_status AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'DISABLED', 'PAUSED', 'LIMIT_EXCEEDED');
CREATE TYPE template_category AS ENUM ('AUTHENTICATION', 'MARKETING', 'UTILITY');

CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  meta_template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category template_category NOT NULL,
  status template_status DEFAULT 'PENDING' NOT NULL,
  components JSONB,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(whatsapp_number_id, meta_template_id)
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own templates" ON public.templates
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_templates_whatsapp ON public.templates(whatsapp_number_id);

-- ═══════════════════════════════════════════════════════
-- AUTOMATION RULES
-- ═══════════════════════════════════════════════════════
CREATE TYPE automation_trigger AS ENUM ('first_message', 'keyword', 'always');

CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type automation_trigger NOT NULL,
  trigger_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own automations" ON public.automations
  FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- AUTOMATION STEPS (Flow builder)
-- ═══════════════════════════════════════════════════════
CREATE TYPE step_type AS ENUM ('message', 'menu', 'condition', 'delay', 'assign');

CREATE TABLE public.automation_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type step_type NOT NULL,
  message_content TEXT,
  menu_options JSONB,
  condition_rules JSONB,
  delay_seconds INT,
  next_step_id UUID REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation steps" ON public.automation_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own automation steps" ON public.automation_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════
-- AUTOMATION SESSIONS (Track active flows per contact)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.automation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  current_step_id UUID REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  session_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_automation_sessions_contact ON public.automation_sessions(contact_phone);

-- ═══════════════════════════════════════════════════════
-- WEBHOOK LOGS (For debugging)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════
-- USER SETTINGS
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_whatsapp_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  notification_sound BOOLEAN DEFAULT true,
  auto_assign BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE AND SETTINGS ON SIGNUP
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════
-- UPDATE TIMESTAMP FUNCTION
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_whatsapp_numbers_updated_at BEFORE UPDATE ON public.whatsapp_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();