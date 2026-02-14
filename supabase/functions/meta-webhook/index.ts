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
  contacts?: Array<{ name?: { formatted_name?: string }; phones?: Array<{ phone?: string }> }>;
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

// Download media from WhatsApp and upload to Supabase Storage
async function downloadAndStoreMedia(
  accessToken: string,
  mediaId: string,
  mimeType: string,
  supabase: any
): Promise<string | null> {
  try {
    // Step 1: Get media URL from WhatsApp
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )
    const mediaInfo = await mediaInfoResponse.json()
    console.log('Media info fetched:', mediaInfo.url ? 'URL obtained' : 'No URL')
    
    if (!mediaInfo.url) {
      console.error('No media URL in response')
      return null
    }
    
    // Step 2: Download the media file
    const mediaResponse = await fetch(mediaInfo.url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (!mediaResponse.ok) {
      console.error('Failed to download media:', mediaResponse.status)
      return null
    }
    
    const mediaBuffer = await mediaResponse.arrayBuffer()
    
    // Step 3: Determine file extension
    let extension = 'jpg'
    if (mimeType.includes('png')) extension = 'png'
    else if (mimeType.includes('gif')) extension = 'gif'
    else if (mimeType.includes('webp')) extension = 'webp'
    else if (mimeType.includes('pdf')) extension = 'pdf'
    else if (mimeType.includes('mp4')) extension = 'mp4'
    else if (mimeType.includes('ogg')) extension = 'ogg'
    else if (mimeType.includes('mp3')) extension = 'mp3'
    
    // Step 4: Upload to Supabase Storage (chat-media bucket)
    const fileName = `chat-media/${Date.now()}-${mediaId}.${extension}`
    
    const { error: uploadError } = await supabase.storage
      .from('room-photos') // Using existing public bucket for chat media
      .upload(fileName, mediaBuffer, {
        contentType: mimeType,
        upsert: false,
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }
    
    // Step 5: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('room-photos')
      .getPublicUrl(fileName)
    
    console.log('Media uploaded, public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('Error downloading/uploading media:', error)
    return null
  }
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
      console.log('Webhook received:', JSON.stringify(body, null, 2))
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      await supabase.from('webhook_logs').insert({
        event_type: 'whatsapp_webhook',
        payload: body,
        processed: false,
      })
      console.log('Webhook logged to database')

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue

          const value = change.value
          const phoneNumberId = value.metadata?.phone_number_id
          if (!phoneNumberId) continue

          console.log('Processing phone_number_id:', phoneNumberId)
          
          const { data: waNumber, error: waError } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id, access_token, phone_number_id')
            .eq('phone_number_id', phoneNumberId)
            .maybeSingle()

          if (waError) {
            console.error('Error fetching WhatsApp number:', waError)
            continue
          }
          
          if (!waNumber) {
            console.log('No WhatsApp number found for phone_number_id:', phoneNumberId)
            continue
          }
          
          console.log('Found WhatsApp number:', waNumber.id)

          for (const message of value.messages || []) {
            console.log('Processing inbound message from:', message.from, 'type:', message.type)
            await processIncomingMessage(
              supabase, 
              waNumber as { id: string; user_id: string; access_token: string; phone_number_id: string }, 
              message, 
              value.contacts?.[0],
              SUPABASE_URL
            )
          }

          for (const status of value.statuses || []) {
            console.log('Processing status update:', status.status, 'for message:', status.id)
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

// deno-lint-ignore no-explicit-any
async function processIncomingMessage(
  supabase: any,
  waNumber: { id: string; user_id: string; access_token: string; phone_number_id: string },
  message: WebhookMessage,
  contact?: { profile?: { name: string }; wa_id: string },
  supabaseUrl?: string
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

  // Download and store media if it's an image or document
  let mediaUrl: string | null = null
  let mediaMimeType: string | null = null
  
  if (message.type === 'image' && message.image) {
    console.log('Downloading image media:', message.image.id)
    mediaUrl = await downloadAndStoreMedia(
      waNumber.access_token,
      message.image.id,
      message.image.mime_type,
      supabase
    )
    mediaMimeType = message.image.mime_type
  } else if (message.type === 'document' && message.document) {
    console.log('Downloading document media:', message.document.id)
    mediaUrl = await downloadAndStoreMedia(
      waNumber.access_token,
      message.document.id,
      message.document.mime_type,
      supabase
    )
    mediaMimeType = message.document.mime_type
  }

  await supabase.from('messages').insert({
    user_id: waNumber.user_id,
    conversation_id: conversationId,
    whatsapp_number_id: waNumber.id,
    wa_message_id: message.id,
    direction: 'inbound',
    type: message.type as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location',
    content: messageContent,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    status: 'delivered',
  })

  // Trigger automation bots if configured for this number
  if (supabaseUrl && (message.type === 'text' || message.type === 'image' || message.type === 'document' || message.type === 'contacts')) {
    // Build media info
    let mediaInfo: { type: string; id: string; mime_type: string; filename?: string } | null = null
    if (message.type === 'image' && message.image) {
      mediaInfo = { type: 'image', id: message.image.id, mime_type: message.image.mime_type }
    } else if (message.type === 'document' && message.document) {
      mediaInfo = { type: 'document', id: message.document.id, mime_type: message.document.mime_type, filename: message.document.filename }
    } else if (message.type === 'contacts' && message.contacts?.length) {
      mediaInfo = { type: 'contacts', id: `contact_${Date.now()}`, mime_type: 'text/vcard', filename: 'contact.vcf' }
    }

    const botPayload = {
      whatsapp_number_id: waNumber.id,
      phone_number_id: waNumber.phone_number_id,
      access_token: waNumber.access_token,
      from_phone: contactPhone,
      message_text: messageContent,
      message_type: message.type,
      media_info: mediaInfo,
      contact_name: contactName,
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    }

    // Try hotel bot
    try {
      console.log('Triggering hotel bot for message:', messageContent, 'type:', message.type)
      const botResponse = await fetch(`${supabaseUrl}/functions/v1/hotel-bot`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(botPayload),
      })
      const botResult = await botResponse.json()
      console.log('Hotel bot response:', botResult)
    } catch (botError) {
      console.error('Hotel bot error:', botError)
    }

    // Try mobile shop bot
    try {
      console.log('Triggering mobile shop bot for message:', messageContent)
      const shopBotResponse = await fetch(`${supabaseUrl}/functions/v1/mobile-shop-bot`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(botPayload),
      })
      const shopBotResult = await shopBotResponse.json()
      console.log('Mobile shop bot response:', shopBotResult)
    } catch (botError) {
      console.error('Mobile shop bot error:', botError)
    }
  }
}

function extractMessageContent(message: WebhookMessage): string {
  switch (message.type) {
    case 'text': return message.text?.body || ''
    case 'image': return message.image?.caption || '[Image]'
    case 'video': return '[Video]'
    case 'audio': return '[Audio]'
    case 'document': return `[Document: ${message.document?.filename || 'file'}]`
    case 'location': return `[Location]`
    case 'interactive': return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive]'
    default: return `[${message.type}]`
  }
}

// deno-lint-ignore no-explicit-any
async function processStatusUpdate(
  supabase: any,
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
