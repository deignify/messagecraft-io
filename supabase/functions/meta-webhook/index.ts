import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename: string };
  location?: { latitude: number; longitude: number; name?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  button?: { text: string; payload: string };
}

interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

Deno.serve(async (req) => {
  const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WEBHOOK_VERIFY_TOKEN')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      await supabase.from('webhook_logs').insert({
        event_type: 'whatsapp_webhook',
        payload: body,
        processed: false,
      })

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue

          const value = change.value
          const phoneNumberId = value.metadata?.phone_number_id
          if (!phoneNumberId) continue

          const { data: waNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id, access_token')
            .eq('phone_number_id', phoneNumberId)
            .single()

          if (!waNumber) continue

          for (const message of value.messages || []) {
            await processIncomingMessage(supabase, waNumber as { id: string; user_id: string; access_token: string }, message, value.contacts?.[0])
          }

          for (const status of value.statuses || []) {
            await processStatusUpdate(supabase, waNumber as { id: string; user_id: string }, status)
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Webhook error:', error)
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Method not allowed', { status: 405 })
})

async function processIncomingMessage(
  supabase: ReturnType<typeof createClient>,
  waNumber: { id: string; user_id: string; access_token: string },
  message: WebhookMessage,
  contact?: { profile?: { name: string }; wa_id: string }
) {
  const contactPhone = message.from
  const contactName = contact?.profile?.name || null

  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', waNumber.user_id)
    .eq('whatsapp_number_id', waNumber.id)
    .eq('phone', contactPhone)
    .maybeSingle()

  const contactId = existingContact?.id as string | undefined

  if (!contactId) {
    await supabase.from('contacts').insert({
      user_id: waNumber.user_id,
      whatsapp_number_id: waNumber.id,
      phone: contactPhone,
      name: contactName,
      last_message_at: new Date().toISOString(),
    })
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, unread_count')
    .eq('user_id', waNumber.user_id)
    .eq('whatsapp_number_id', waNumber.id)
    .eq('contact_phone', contactPhone)
    .maybeSingle()

  const messageContent = extractMessageContent(message)
  const conversationData = conversation as { id: string; unread_count: number } | null
  let conversationId: string

  if (!conversationData) {
    const { data: newConv } = await supabase.from('conversations').insert({
      user_id: waNumber.user_id,
      whatsapp_number_id: waNumber.id,
      contact_phone: contactPhone,
      contact_name: contactName,
      status: 'open',
      unread_count: 1,
      last_message_text: messageContent,
      last_message_at: new Date().toISOString(),
    }).select('id').single()
    conversationId = (newConv as { id: string }).id
  } else {
    conversationId = conversationData.id
    await supabase.from('conversations').update({
      unread_count: conversationData.unread_count + 1,
      last_message_text: messageContent,
      last_message_at: new Date().toISOString(),
    }).eq('id', conversationId)
  }

  await supabase.from('messages').insert({
    user_id: waNumber.user_id,
    conversation_id: conversationId,
    whatsapp_number_id: waNumber.id,
    wa_message_id: message.id,
    direction: 'inbound',
    type: message.type as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location',
    content: messageContent,
    status: 'delivered',
  })
}

function extractMessageContent(message: WebhookMessage): string {
  switch (message.type) {
    case 'text': return message.text?.body || ''
    case 'image': return message.image?.caption || '[Image]'
    case 'video': return '[Video]'
    case 'audio': return '[Audio]'
    case 'document': return `[Document: ${message.document?.filename || 'file'}]`
    case 'location': return `[Location]`
    case 'interactive': return message.interactive?.button_reply?.title || '[Interactive]'
    default: return `[${message.type}]`
  }
}

async function processStatusUpdate(
  supabase: ReturnType<typeof createClient>,
  waNumber: { id: string; user_id: string },
  status: WebhookStatus
) {
  const updateData: Record<string, string> = { status: status.status }
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString()

  if (status.status === 'sent') updateData.sent_at = timestamp
  if (status.status === 'delivered') updateData.delivered_at = timestamp
  if (status.status === 'read') updateData.read_at = timestamp
  if (status.status === 'failed') updateData.error_message = status.errors?.[0]?.title || 'Failed'

  await supabase.from('messages').update(updateData).eq('wa_message_id', status.id)
}
