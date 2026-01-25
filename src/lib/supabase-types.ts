// Custom type definitions for our database schema
// These work alongside the auto-generated types

export type WhatsAppStatus = 'active' | 'pending' | 'disconnected' | 'error';
export type ConversationStatus = 'open' | 'closed' | 'pending';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive' | 'location' | 'sticker';
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED' | 'PAUSED' | 'LIMIT_EXCEEDED';
export type TemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
export type AutomationTrigger = 'first_message' | 'keyword' | 'always';
export type StepType = 'message' | 'menu' | 'condition' | 'delay' | 'assign';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppNumber {
  id: string;
  user_id: string;
  phone_number: string;
  display_name: string | null;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  token_expires_at: string | null;
  status: WhatsAppStatus;
  business_name: string | null;
  quality_rating: string | null;
  messaging_limit: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  category: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  contact_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  status: ConversationStatus;
  unread_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  conversation_id: string;
  whatsapp_number_id: string;
  wa_message_id: string | null;
  direction: MessageDirection;
  type: MessageType;
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  template_name: string | null;
  template_params: Record<string, unknown> | null;
  status: MessageStatus;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  meta_template_id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface Automation {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  name: string;
  trigger_type: AutomationTrigger;
  trigger_keywords: string[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: StepType;
  message_content: string | null;
  menu_options: Record<string, unknown> | null;
  condition_rules: Record<string, unknown> | null;
  delay_seconds: number | null;
  next_step_id: string | null;
  created_at: string;
}

export interface UserSettings {
  id: string;
  selected_whatsapp_id: string | null;
  notification_sound: boolean;
  auto_assign: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}
