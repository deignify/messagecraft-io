import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
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

interface MetaMessageResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const body: SendMessageRequest = await req.json()
    const { whatsapp_number_id, to, message_type, content, template_name, template_language, template_params, media_url, media_caption, interactive } = body

    // Validate required fields
    if (!whatsapp_number_id || !to) {
      throw new Error('Missing required fields: whatsapp_number_id and to')
    }

    // Get WhatsApp number details
    const { data: waNumber, error: waError } = await supabase
      .from('whatsapp_numbers')
      .select('phone_number_id, access_token, id')
      .eq('id', whatsapp_number_id)
      .eq('user_id', userData.user.id)
      .single()

    if (waError || !waNumber) {
      throw new Error('WhatsApp number not found or access denied')
    }

    // Build the message payload based on type
    let messagePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''), // Remove non-digits
    }

    switch (message_type) {
      case 'text':
        if (!content) throw new Error('Content is required for text messages')
        messagePayload.type = 'text'
        messagePayload.text = { 
          preview_url: true,
          body: content 
        }
        break

      case 'template':
        if (!template_name || !template_language) {
          throw new Error('template_name and template_language are required for template messages')
        }
        messagePayload.type = 'template'
        messagePayload.template = {
          name: template_name,
          language: { code: template_language },
          components: buildTemplateComponents(template_params),
        }
        break

      case 'image':
        if (!media_url) throw new Error('media_url is required for image messages')
        messagePayload.type = 'image'
        messagePayload.image = {
          link: media_url,
          caption: media_caption,
        }
        break

      case 'document':
        if (!media_url) throw new Error('media_url is required for document messages')
        messagePayload.type = 'document'
        messagePayload.document = {
          link: media_url,
          caption: media_caption,
        }
        break

      case 'video':
        if (!media_url) throw new Error('media_url is required for video messages')
        messagePayload.type = 'video'
        messagePayload.video = {
          link: media_url,
          caption: media_caption,
        }
        break

      case 'audio':
        if (!media_url) throw new Error('media_url is required for audio messages')
        messagePayload.type = 'audio'
        messagePayload.audio = {
          link: media_url,
        }
        break

      case 'interactive':
        if (!interactive) throw new Error('interactive object is required for interactive messages')
        messagePayload.type = 'interactive'
        messagePayload.interactive = interactive
        break

      default:
        throw new Error(`Unsupported message type: ${message_type}`)
    }

    // Send message via Meta API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${waNumber.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waNumber.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    )

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error('Meta API error:', metaData)
      throw new Error(metaData.error?.message || 'Failed to send message')
    }

    const waMessageId = (metaData as MetaMessageResponse).messages?.[0]?.id

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('contact_phone', to)
      .maybeSingle()

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          user_id: userData.user.id,
          whatsapp_number_id: whatsapp_number_id,
          contact_phone: to,
          status: 'open',
          unread_count: 0,
          last_message_text: content || `[${message_type}]`,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      conversation = newConversation
    } else {
      await supabase
        .from('conversations')
        .update({
          last_message_text: content || `[${message_type}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversation.id)
    }

    // Store the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: userData.user.id,
        conversation_id: conversation!.id,
        whatsapp_number_id: whatsapp_number_id,
        wa_message_id: waMessageId,
        direction: 'outbound',
        type: message_type,
        content: content || (template_name ? `Template: ${template_name}` : `[${message_type}]`),
        media_url: media_url,
        template_name: template_name,
        template_params: template_params,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (messageError) {
      console.error('Failed to store message:', messageError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message_id: waMessageId,
      message: message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Send message error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildTemplateComponents(params?: Record<string, string[]>): Array<Record<string, unknown>> {
  if (!params) return []

  const components: Array<Record<string, unknown>> = []

  if (params.header) {
    components.push({
      type: 'header',
      parameters: params.header.map(value => ({ type: 'text', text: value })),
    })
  }

  if (params.body) {
    components.push({
      type: 'body',
      parameters: params.body.map(value => ({ type: 'text', text: value })),
    })
  }

  if (params.buttons) {
    params.buttons.forEach((value, index) => {
      components.push({
        type: 'button',
        sub_type: 'quick_reply',
        index: index,
        parameters: [{ type: 'payload', payload: value }],
      })
    })
  }

  return components
}
