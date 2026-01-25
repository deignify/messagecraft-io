import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

// Meta OAuth functions
export async function getMetaAuthUrl(redirectUri: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/meta-oauth?action=get-auth-url`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ redirect_uri: redirectUri }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get auth URL');
  }
  
  return response.json();
}

export async function handleMetaCallback(code: string, redirectUri: string, state: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/meta-oauth?action=callback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'OAuth callback failed');
  }
  
  return response.json();
}

export async function refreshMetaToken(whatsappNumberId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/meta-oauth?action=refresh-token`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ whatsapp_number_id: whatsappNumberId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Token refresh failed');
  }
  
  return response.json();
}

// Message sending
export interface SendMessageParams {
  whatsapp_number_id: string;
  to: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'video' | 'audio' | 'interactive';
  content?: string;
  template_name?: string;
  template_language?: string;
  template_params?: Record<string, string[]>;
  media_url?: string;
  media_caption?: string;
  interactive?: {
    type: 'button' | 'list';
    header?: { type: string; text?: string };
    body: { text: string };
    footer?: { text: string };
    action: Record<string, unknown>;
  };
}

export async function sendMessage(params: SendMessageParams) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-message`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }
  
  return response.json();
}

// Template sync
export async function syncTemplates(whatsappNumberId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/sync-templates`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ whatsapp_number_id: whatsappNumberId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync templates');
  }
  
  return response.json();
}

// Automation management
export interface AutomationStep {
  step_order: number;
  step_type: 'message' | 'menu' | 'condition' | 'delay' | 'assign';
  message_content?: string;
  menu_options?: { options: Array<{ id: string; title: string }> };
  condition_rules?: { conditions: Array<{ keyword: string; next_step_id: string }> };
  delay_seconds?: number;
}

export interface AutomationConfig {
  name: string;
  trigger_type: 'first_message' | 'keyword' | 'always';
  trigger_keywords?: string[];
  is_active?: boolean;
  priority?: number;
  steps?: AutomationStep[];
}

export async function createAutomation(whatsappNumberId: string, automation: AutomationConfig) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'create',
        whatsapp_number_id: whatsappNumberId,
        automation,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create automation');
  }
  
  return response.json();
}

export async function updateAutomation(automationId: string, automation: Partial<AutomationConfig>) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'update',
        automation_id: automationId,
        automation,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update automation');
  }
  
  return response.json();
}

export async function deleteAutomation(automationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'delete',
        automation_id: automationId,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete automation');
  }
  
  return response.json();
}

export async function toggleAutomation(automationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'toggle',
        automation_id: automationId,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to toggle automation');
  }
  
  return response.json();
}

export async function testAutomation(automationId: string, testPhone: string, testMessage: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'test',
        automation_id: automationId,
        test_phone: testPhone,
        test_message: testMessage,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to test automation');
  }
  
  return response.json();
}

export async function getAutomationSessions(automationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/automation-engine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'get-sessions',
        automation_id: automationId,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get sessions');
  }
  
  return response.json();
}
