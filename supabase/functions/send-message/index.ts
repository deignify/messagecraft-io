import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SendMessageSchema = z.object({
  whatsapp_number_id: z.string().uuid(),
  to: z.string().min(1).max(20),
  message_type: z.enum(['text', 'template', 'image', 'document', 'video', 'audio', 'interactive']),
  content: z.string().max(4096).optional(),
  template_name: z.string().max(512).optional(),
  template_language: z.string().max(10).optional(),
  template_params: z.record(z.array(z.string().max(1024))).optional(),
  media_url: z.string().url().max(2048).optional(),
  media_caption: z.string().max(1024).optional(),
  media_filename: z.string().max(256).optional(),
  interactive: z.object({
    type: z.enum(['button', 'list']),
    header: z.object({ type: z.string(), text: z.string().optional() }).optional(),
    body: z.object({ text: z.string().max(1024) }),
    footer: z.object({ text: z.string().max(60) }).optional(),
    action: z.record(z.unknown()),
  }).optional(),
}).strict()

type SendMessageRequest = z.infer<typeof SendMessageSchema>

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

    const rawBody = await req.json()
    const parseResult = SendMessageSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = parseResult.data
    const { whatsapp_number_id, to, message_type, content, template_name, template_language, template_params, media_url, media_caption, media_filename, interactive } = body

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
    // Normalize phone number - remove non-digits and ensure consistent format
    const normalizedPhone = to.replace(/\D/g, '');
    
    let messagePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
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
          filename: media_filename || 'document',
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
      
      // Parse Meta API error for user-friendly message
      const errorCode = metaData.error?.code
      const errorSubcode = metaData.error?.error_subcode
      const errorMessage = metaData.error?.message || 'Failed to send message'
      const errorType = metaData.error?.type
      
      let userFriendlyError = errorMessage
      
      // Map common Meta API errors to user-friendly messages
      if (errorCode === 131026 || errorSubcode === 2388032) {
        userFriendlyError = 'Message failed: Recipient phone number is not a valid WhatsApp account'
      } else if (errorCode === 131047) {
        userFriendlyError = 'Message failed: 24-hour messaging window expired. Use a template message'
      } else if (errorCode === 131051) {
        userFriendlyError = 'Template message failed: Template not found or not approved'
      } else if (errorCode === 131053) {
        userFriendlyError = 'Media upload failed: Unable to download media from URL'
      } else if (errorCode === 131056) {
        userFriendlyError = 'Business verification required: Complete business verification in Meta Business Suite'
      } else if (errorCode === 131042) {
        userFriendlyError = 'Payment issue: Business has reached message limits. Check billing in Meta Business Suite'
      } else if (errorCode === 132000 || errorSubcode === 2494055) {
        userFriendlyError = 'Template error: Template parameters do not match. Check variable count'
      } else if (errorCode === 132001) {
        userFriendlyError = 'Template error: Template does not exist or is not approved'
      } else if (errorCode === 132005) {
        userFriendlyError = 'Template error: Incorrect number of template parameters'
      } else if (errorCode === 132007) {
        userFriendlyError = 'Template error: Template format mismatch'
      } else if (errorCode === 132012) {
        userFriendlyError = 'Template paused: This template has been paused due to low quality'
      } else if (errorCode === 132015 || errorCode === 132016) {
        userFriendlyError = 'Template disabled: This template has been disabled'
      } else if (errorCode === 130429) {
        userFriendlyError = 'Rate limit exceeded: Too many messages sent. Please wait and try again'
      } else if (errorCode === 136025) {
        userFriendlyError = 'Payment required: Add a valid payment method in Meta Business Suite'
      } else if (errorCode === 400 && errorType === 'OAuthException') {
        userFriendlyError = 'Authentication error: Access token may have expired. Reconnect WhatsApp number'
      } else if (errorCode === 190) {
        userFriendlyError = 'Access token expired: Please reconnect your WhatsApp number'
      } else if (errorCode === 100) {
        userFriendlyError = 'Invalid request: ' + errorMessage
      }
      
      throw new Error(userFriendlyError)
    }

    const waMessageId = (metaData as MetaMessageResponse).messages?.[0]?.id

    // Find or create conversation - check both normalized and original phone formats
    // First try exact match with original
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('contact_phone', to)
      .maybeSingle()

    // If not found, try with normalized phone (without +)
    if (!conversation && to.startsWith('+')) {
      const phoneWithoutPlus = to.replace(/^\+/, '');
      const { data: normalizedConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('whatsapp_number_id', whatsapp_number_id)
        .eq('contact_phone', phoneWithoutPlus)
        .maybeSingle()
      conversation = normalizedConversation
    }

    // Also try with + prefix if original didn't have it
    if (!conversation && !to.startsWith('+')) {
      const phoneWithPlus = '+' + to;
      const { data: plusConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('whatsapp_number_id', whatsapp_number_id)
        .eq('contact_phone', phoneWithPlus)
        .maybeSingle()
      conversation = plusConversation
    }

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          user_id: userData.user.id,
          whatsapp_number_id: whatsapp_number_id,
          contact_phone: normalizedPhone, // Use normalized phone for consistency
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
