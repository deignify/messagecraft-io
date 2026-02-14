import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShopBotRequest {
  whatsapp_number_id: string;
  phone_number_id: string;
  access_token: string;
  from_phone: string;
  message_text: string;
  message_type?: string;
  media_info?: { type: string; id: string; mime_type: string };
  contact_name?: string;
  interactive_reply_id?: string | null;
}

interface BotSession {
  state: string;
  data: Record<string, unknown>;
}

interface Product {
  brand: string;
  model: string;
  variant: string;
  color: string;
  price: number;
  stock: number;
  type: string;
  available: string;
}

interface Branch {
  name: string;
  address: string;
  city: string;
  contact_phone: string;
  upi_id: string;
  is_active: string;
}

// ============ GOOGLE SHEETS AUTH ============
function base64UrlEncode(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const sa = JSON.parse(serviceAccountKey)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const encodedClaim = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claim)))
  const signatureInput = `${encodedHeader}.${encodedClaim}`

  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = base64UrlEncode(new Uint8Array(signature))
  const jwt = `${signatureInput}.${encodedSignature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  if (!tokenData.access_token) {
    console.error('Google token error:', tokenData)
    throw new Error('Failed to get Google access token')
  }
  return tokenData.access_token
}

// ============ GOOGLE SHEETS API ============
async function readSheet(accessToken: string, sheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Sheets read error:', data)
    return []
  }
  return data.values || []
}

async function appendSheet(accessToken: string, sheetId: string, range: string, values: string[][]): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    console.error('Sheets append error:', await res.json())
    return false
  }
  return true
}

// ============ WHATSAPP MESSAGING ============
async function sendWhatsAppMessage(
  phoneNumberId: string, accessToken: string, to: string, message: string
): Promise<{ success: boolean; waMessageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: message },
        }),
      }
    )
    const result = await response.json()
    return { success: response.ok, waMessageId: result?.messages?.[0]?.id }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false }
  }
}

async function sendWhatsAppInteractiveButtons(
  phoneNumberId: string, accessToken: string, to: string,
  bodyText: string, buttons: { id: string; title: string }[]
): Promise<{ success: boolean; waMessageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.substring(0, 20) },
              })),
            },
          },
        }),
      }
    )
    const result = await response.json()
    return { success: response.ok, waMessageId: result?.messages?.[0]?.id }
  } catch (error) {
    console.error('WhatsApp interactive send error:', error)
    return { success: false }
  }
}

async function sendWhatsAppInteractiveList(
  phoneNumberId: string, accessToken: string, to: string,
  bodyText: string, buttonText: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<{ success: boolean; waMessageId?: string }> {
  try {
    let totalRows = 0
    const limitedSections = sections.map(section => {
      const remaining = 10 - totalRows
      if (remaining <= 0) return { ...section, rows: [] }
      const limitedRows = section.rows.slice(0, remaining)
      totalRows += limitedRows.length
      return { ...section, rows: limitedRows }
    }).filter(s => s.rows.length > 0)

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: bodyText },
            action: {
              button: buttonText.substring(0, 20),
              sections: limitedSections,
            },
          },
        }),
      }
    )
    const result = await response.json()
    if (!response.ok) console.error('List send error:', result)
    return { success: response.ok, waMessageId: result?.messages?.[0]?.id }
  } catch (error) {
    console.error('WhatsApp list send error:', error)
    return { success: false }
  }
}

// ============ HELPER FUNCTIONS ============
// Get only available products (stock > 0 and available = yes)
function getAvailableProducts(rows: string[][]): Product[] {
  return getAllProducts(rows).filter(p => p.available.toLowerCase() === 'yes' && p.stock > 0)
}

// Get ALL products including unavailable ones (for showing models to customers)
function getAllProducts(rows: string[][]): Product[] {
  return rows.slice(1).map(row => ({
    brand: (row[0] || '').trim(),
    model: (row[1] || '').trim(),
    variant: (row[2] || '').trim(),
    color: (row[3] || '').trim(),
    price: parseInt(row[4] || '0'),
    stock: parseInt(row[5] || '0'),
    type: (row[6] || 'new').trim().toLowerCase(),
    available: (row[7] || 'Yes').trim(),
  })).filter(p => p.brand && p.model)
}

function isProductAvailable(product: Product): boolean {
  return product.available.toLowerCase() === 'yes' && product.stock > 0
}

function getBranches(rows: string[][]): Branch[] {
  return rows.slice(1).map(row => ({
    name: (row[0] || '').trim(),
    address: (row[1] || '').trim(),
    city: (row[2] || '').trim(),
    contact_phone: (row[3] || '').trim(),
    upi_id: (row[4] || '').trim(),
    is_active: (row[5] || 'Yes').trim(),
  })).filter(b => b.name && b.is_active.toLowerCase() === 'yes')
}

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function getUniqueValues<T>(arr: T[], key: keyof T): string[] {
  return [...new Set(arr.map(item => String(item[key])))]
}

function fuzzyMatch(input: string, target: string): boolean {
  const a = input.toLowerCase().replace(/\s+/g, '')
  const b = target.toLowerCase().replace(/\s+/g, '')
  return b.includes(a) || a.includes(b) || levenshtein(a, b) <= 2
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j - 1] + 1, dp[i][j - 1] + 1, dp[i - 1][j] + 1)
    }
  }
  return dp[m][n]
}

// Resolve selection from interactive reply ID or fuzzy text match
function resolveSelection(msg: string, originalMsg: string, replyId: string | null, prefix: string, list: string[]): string {
  // First try reply ID (e.g. "brand_0", "model_1", "variant_2")
  if (replyId) {
    const idMatch = replyId.match(new RegExp(`^${prefix}_(\\d+)$`))
    if (idMatch && list[parseInt(idMatch[1])]) {
      return list[parseInt(idMatch[1])]
    }
  }
  // Then try the message text against IDs
  const msgIdMatch = msg.match(new RegExp(`^${prefix}_(\\d+)$`))
  if (msgIdMatch && list[parseInt(msgIdMatch[1])]) {
    return list[parseInt(msgIdMatch[1])]
  }
  // Finally fuzzy match the text
  return list.find(item => fuzzyMatch(originalMsg, item)) || ''
}

// ============ STORE BOT MESSAGE IN DB ============
async function storeBotMessage(
  supabase: any, userId: string, conversationId: string | null,
  waNumberId: string, contactPhone: string, content: string, waMessageId?: string
) {
  if (!conversationId) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('whatsapp_number_id', waNumberId)
      .eq('contact_phone', contactPhone)
      .maybeSingle()
    conversationId = conv?.id
  }
  if (!conversationId) return

  await supabase.from('messages').insert({
    user_id: userId,
    conversation_id: conversationId,
    whatsapp_number_id: waNumberId,
    direction: 'outbound',
    type: 'text',
    content,
    status: waMessageId ? 'sent' : 'pending',
    wa_message_id: waMessageId || null,
    sent_at: new Date().toISOString(),
  })
}

// ============ MAIN BOT LOGIC ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const GOOGLE_SA_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body: ShopBotRequest = await req.json()
    const { whatsapp_number_id, phone_number_id, access_token, from_phone, message_text, message_type, contact_name, interactive_reply_id } = body

    console.log('Mobile shop bot processing:', message_text, 'type:', message_type, 'reply_id:', interactive_reply_id, 'from:', from_phone)

    // Get shop config
    const { data: shop, error: shopError } = await supabase
      .from('mobile_shops')
      .select('*')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('is_active', true)
      .maybeSingle()

    if (shopError || !shop) {
      console.log('No active mobile shop found')
      return new Response(JSON.stringify({ processed: false, reason: 'no_shop' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!shop.google_sheet_id) {
      console.log('No Google Sheet configured')
      return new Response(JSON.stringify({ processed: false, reason: 'no_sheet' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!GOOGLE_SA_KEY) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
      return new Response(JSON.stringify({ processed: false, reason: 'no_google_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const googleToken = await getGoogleAccessToken(GOOGLE_SA_KEY)

    // Ensure automation record
    const SHOP_BOT_NAME = 'Mobile Shop Bot'
    const { data: existingAutomation } = await supabase
      .from('automations')
      .select('id')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('user_id', shop.user_id)
      .eq('name', SHOP_BOT_NAME)
      .maybeSingle()

    let automationId = existingAutomation?.id ?? null
    if (!automationId) {
      const { data: created } = await supabase
        .from('automations')
        .insert({
          name: SHOP_BOT_NAME,
          user_id: shop.user_id,
          whatsapp_number_id,
          trigger_type: 'always',
          is_active: true,
          priority: 100,
        })
        .select('id')
        .single()
      automationId = created?.id
    }

    // Get or create session
    let session: BotSession = { state: 'welcome', data: {} }
    let sessionRowId: string | null = null

    if (automationId) {
      const { data: existingSession } = await supabase
        .from('automation_sessions')
        .select('session_data, id')
        .eq('automation_id', automationId)
        .eq('contact_phone', from_phone)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession?.session_data) {
        session = existingSession.session_data as BotSession
        sessionRowId = existingSession.id
      } else {
        const { data: created } = await supabase
          .from('automation_sessions')
          .insert({
            automation_id: automationId,
            contact_phone: from_phone,
            is_active: true,
            session_data: session,
          })
          .select('id, session_data')
          .single()
        if (created) {
          sessionRowId = created.id
          session = created.session_data as BotSession
        }
      }
    }

    const msg = message_text.toLowerCase().trim()
    const originalMsg = message_text.trim()
    const replyId = interactive_reply_id || null
    let responseText = ''
    let newState = session.state
    let useInteractiveButtons = false
    let interactiveButtons: { id: string; title: string }[] = []
    let useInteractiveList = false
    let listBody = ''
    let listButtonText = ''
    let listSections: { title: string; rows: { id: string; title: string; description?: string }[] }[] = []

    // Load products and branches from sheet
    const [productRows, branchRows] = await Promise.all([
      readSheet(googleToken, shop.google_sheet_id, 'Products!A:H'),
      readSheet(googleToken, shop.google_sheet_id, 'Branches!A:F'),
    ])
    const allProducts = getAllProducts(productRows)
    const availableProducts = allProducts.filter(p => isProductAvailable(p))
    const branches = getBranches(branchRows)

    // ===== RESET COMMANDS =====
    if (msg === '0' || msg === 'menu' || msg === 'hi' || msg === 'hello' || msg === 'start' || msg === 'reset') {
      const lang = shop.language || 'hinglish'
      const welcomeMsg = shop.welcome_message || getDefaultWelcome(shop.name, lang)
      responseText = welcomeMsg
      useInteractiveButtons = true
      interactiveButtons = [
        { id: 'new_phone', title: '📱 New Phone' },
        { id: 'secondhand', title: '♻️ Second Hand' },
        { id: 'search', title: '🔍 Search Model' },
      ]
      newState = 'welcome'
      session.data = {}
    }
    // ===== WELCOME STATE - TYPE SELECTION =====
    else if (session.state === 'welcome') {
      const isNewPhone = replyId === 'new_phone' || msg === 'new_phone' || msg === 'new phone' || msg === 'new' || msg === '1' || msg.includes('📱 new phone') || msg.includes('new') || msg.includes('naya') || msg.includes('nya')
      const isSecondHand = replyId === 'secondhand' || msg === 'secondhand' || msg === 'second hand' || msg === 'second' || msg === '2' || msg.includes('♻️ second hand') || msg.includes('second') || msg.includes('purana') || msg.includes('used')
      const isSearch = replyId === 'search' || msg === 'search' || msg === '3' || msg.includes('🔍 search model') || msg.includes('search') || msg.includes('find') || msg.includes('dhundo')

      if (isNewPhone) {
        session.data.phone_type = 'new'
        newState = 'choose_brand'
        // Show ALL brands for new phones (including models that may be unavailable)
        const newProducts = allProducts.filter(p => p.type === 'new')
        const uniqueBrands = getUniqueValues(newProducts, 'brand')
        if (uniqueBrands.length === 0) {
          responseText = '😔 Abhi new phones available nahi hai. Jaldi aa jayenge!\n\n_Reply 0 for menu_'
          newState = 'welcome'
        } else {
          listBody = '📱 *New Phones* - Brand select karein:'
          listButtonText = 'Select Brand'
          listSections = [{
            title: 'Available Brands',
            rows: uniqueBrands.map((b, i) => {
              const count = new Set(newProducts.filter(p => p.brand.toLowerCase() === b.toLowerCase()).map(p => p.model)).size
              return { id: `brand_${i}`, title: b, description: `${count} models` }
            }),
          }]
          useInteractiveList = true
          session.data.brands = uniqueBrands
        }
      }
      else if (isSecondHand) {
        session.data.phone_type = 'secondhand'
        newState = 'choose_brand'
        const shProducts = allProducts.filter(p => p.type === 'secondhand')
        const uniqueBrands = getUniqueValues(shProducts, 'brand')
        if (uniqueBrands.length === 0) {
          responseText = '😔 Abhi second hand phones available nahi hai.\n\n_Reply 0 for menu_'
          newState = 'welcome'
        } else {
          listBody = '♻️ *Second Hand Phones* - Brand select karein:'
          listButtonText = 'Select Brand'
          listSections = [{
            title: 'Available Brands',
            rows: uniqueBrands.map((b, i) => {
              const count = new Set(shProducts.filter(p => p.brand.toLowerCase() === b.toLowerCase()).map(p => p.model)).size
              return { id: `brand_${i}`, title: b, description: `${count} models` }
            }),
          }]
          useInteractiveList = true
          session.data.brands = uniqueBrands
        }
      }
      else if (isSearch) {
        responseText = '🔍 *Search karo!*\n\nBrand name, model name, ya budget type karein:\n\n_Examples:_\n• _"iPhone"_\n• _"Samsung"_\n• _"best phone under 20000"_\n• _"iPhone 16 Pro"_'
        newState = 'free_search'
      }
      else {
        // Try to detect intent from free text
        const searchResult = handleFreeTextSearch(msg, allProducts)
        if (searchResult) {
          responseText = searchResult.text
          newState = searchResult.newState || 'welcome'
          if (searchResult.data) session.data = { ...session.data, ...searchResult.data }
          if (searchResult.list) {
            useInteractiveList = true
            listBody = searchResult.list.body
            listButtonText = searchResult.list.button
            listSections = searchResult.list.sections
          }
        } else {
          responseText = '🤔 Samajh nahi aaya. Kripya button dabayein ya brand/model name likhein.\n\n_Reply 0 for menu_'
        }
      }
    }
    // ===== FREE SEARCH STATE =====
    else if (session.state === 'free_search') {
      const searchResult = handleFreeTextSearch(msg, allProducts)
      if (searchResult) {
        responseText = searchResult.text
        newState = searchResult.newState || 'welcome'
        if (searchResult.data) session.data = { ...session.data, ...searchResult.data }
        if (searchResult.list) {
          useInteractiveList = true
          listBody = searchResult.list.body
          listButtonText = searchResult.list.button
          listSections = searchResult.list.sections
        }
      } else {
        responseText = '❌ Koi matching product nahi mila.\n\nKoi aur brand/model try karein ya 0 for menu.'
      }
    }
    // ===== CHOOSE BRAND =====
    else if (session.state === 'choose_brand') {
      const brandsList = (session.data.brands as string[]) || []
      const phoneType = (session.data.phone_type as string) || 'new'
      const selectedBrand = resolveSelection(msg, originalMsg, replyId, 'brand', brandsList)

      if (selectedBrand) {
        session.data.selected_brand = selectedBrand
        // Show ALL models for this brand (including unavailable)
        const brandProducts = allProducts.filter(p =>
          p.brand.toLowerCase() === selectedBrand.toLowerCase() && p.type === phoneType
        )
        const uniqueModels = getUniqueValues(brandProducts, 'model')

        if (uniqueModels.length === 0) {
          responseText = `❌ ${selectedBrand} ke models abhi available nahi hai.\n\n_Reply 0 for menu_`
          newState = 'welcome'
        } else {
          listBody = `📱 *${selectedBrand}* - Model select karein:`
          listButtonText = 'Select Model'
          listSections = [{
            title: `${selectedBrand} Models`,
            rows: uniqueModels.map((m, i) => {
              const mp = brandProducts.filter(p => p.model === m)
              const availableCount = mp.filter(p => isProductAvailable(p)).length
              const minPrice = Math.min(...mp.map(p => p.price))
              const status = availableCount > 0 ? `From ${formatPrice(minPrice)}` : '⚠️ Currently Unavailable'
              return { id: `model_${i}`, title: m, description: status }
            }),
          }]
          useInteractiveList = true
          session.data.models = uniqueModels
          newState = 'choose_model'
        }
      } else {
        responseText = '❌ Brand nahi mila. List se select karein ya 0 for menu.'
      }
    }
    // ===== CHOOSE MODEL =====
    else if (session.state === 'choose_model') {
      const modelsList = (session.data.models as string[]) || []
      const phoneType = (session.data.phone_type as string) || 'new'
      const selectedBrand = (session.data.selected_brand as string) || ''
      const selectedModel = resolveSelection(msg, originalMsg, replyId, 'model', modelsList)

      if (selectedModel) {
        session.data.selected_model = selectedModel
        const modelProducts = allProducts.filter(p =>
          p.brand.toLowerCase() === selectedBrand.toLowerCase() &&
          p.model.toLowerCase() === selectedModel.toLowerCase() &&
          p.type === phoneType
        )
        
        // Check if ANY variant of this model is available
        const availableModelProducts = modelProducts.filter(p => isProductAvailable(p))
        
        if (availableModelProducts.length === 0) {
          // Model exists but ALL variants are unavailable
          // Notify agent about customer inquiry
          await notifyAgent(shop, from_phone, contact_name || 'Customer', `${selectedBrand} ${selectedModel}`, phone_number_id, access_token, supabase)
          
          responseText = `😔 *${selectedBrand} ${selectedModel}* abhi available nahi hai.\n\n` +
            `Koi baat nahi! Humara agent aapko jaldi contact karke availability check karke btayega. 🙏\n\n` +
            `Kya aap koi aur model dekhna chahenge?\n\n_Reply 0 for menu_`
          useInteractiveButtons = true
          interactiveButtons = [
            { id: 'new_phone', title: '📱 New Phone' },
            { id: 'secondhand', title: '♻️ Second Hand' },
            { id: 'search', title: '🔍 Search Model' },
          ]
          newState = 'welcome'
          session.data = {}
        } else {
          // Show only available variants
          const uniqueVariants = getUniqueValues(availableModelProducts, 'variant')

          if (uniqueVariants.length === 1) {
            session.data.selected_variant = uniqueVariants[0]
            const variantProducts = availableModelProducts.filter(p => p.variant === uniqueVariants[0])
            const uniqueColors = getUniqueValues(variantProducts, 'color')

            if (uniqueColors.length === 1) {
              session.data.selected_color = uniqueColors[0]
              const product = variantProducts.find(p => p.color === uniqueColors[0])!
              session.data.product_price = product.price
              responseText = getConfirmMessage(session.data, product)
              useInteractiveButtons = true
              interactiveButtons = [
                { id: 'confirm_yes', title: '✅ Confirm Order' },
                { id: 'confirm_no', title: '❌ Cancel' },
              ]
              newState = 'confirm_product'
            } else {
              listBody = `🎨 *${selectedModel} ${uniqueVariants[0]}* - Color choose karein:`
              listButtonText = 'Select Color'
              listSections = [{
                title: 'Available Colors',
                rows: uniqueColors.map((c, i) => {
                  const cp = variantProducts.find(p => p.color === c)
                  return { id: `color_${i}`, title: c, description: cp ? formatPrice(cp.price) : '' }
                }),
              }]
              useInteractiveList = true
              session.data.colors = uniqueColors
              newState = 'choose_color'
            }
          } else {
            listBody = `📱 *${selectedModel}* - Variant select karein:`
            listButtonText = 'Select Variant'
            listSections = [{
              title: `${selectedModel} Variants`,
              rows: uniqueVariants.map((v, i) => {
                const vp = availableModelProducts.filter(p => p.variant === v)
                const minPrice = Math.min(...vp.map(p => p.price))
                return { id: `variant_${i}`, title: v, description: `From ${formatPrice(minPrice)}` }
              }),
            }]
            useInteractiveList = true
            session.data.variants = uniqueVariants
            newState = 'choose_variant'
          }
        }
      } else {
        // Customer typed something that doesn't match any model
        if (originalMsg.length > 2) {
          await notifyAgent(shop, from_phone, contact_name || 'Customer', originalMsg, phone_number_id, access_token, supabase)
          responseText = `😔 *${originalMsg}* abhi available nahi hai.\n\nKoi baat nahi! Humara agent aapko jaldi contact karega aur availability check karke btayega. 🙏\n\n_Reply 0 for menu_`
          newState = 'welcome'
        } else {
          responseText = '❌ Model nahi mila. List se select karein ya 0 for menu.'
        }
      }
    }
    // ===== CHOOSE VARIANT =====
    else if (session.state === 'choose_variant') {
      const variantsList = (session.data.variants as string[]) || []
      const phoneType = (session.data.phone_type as string) || 'new'
      const selectedBrand = (session.data.selected_brand as string) || ''
      const selectedModel = (session.data.selected_model as string) || ''
      const selectedVariant = resolveSelection(msg, originalMsg, replyId, 'variant', variantsList)

      if (selectedVariant) {
        session.data.selected_variant = selectedVariant
        const variantProducts = availableProducts.filter(p =>
          p.brand.toLowerCase() === selectedBrand.toLowerCase() &&
          p.model.toLowerCase() === selectedModel.toLowerCase() &&
          p.variant.toLowerCase() === selectedVariant.toLowerCase() &&
          p.type === phoneType
        )
        const uniqueColors = getUniqueValues(variantProducts, 'color')

        if (uniqueColors.length === 0) {
          // Variant not available
          await notifyAgent(shop, from_phone, contact_name || 'Customer', `${selectedBrand} ${selectedModel} ${selectedVariant}`, phone_number_id, access_token, supabase)
          responseText = `😔 *${selectedModel} ${selectedVariant}* abhi available nahi hai.\n\nHumara agent aapko jaldi contact karega. 🙏\n\n_Reply 0 for menu_`
          newState = 'welcome'
          session.data = {}
        } else if (uniqueColors.length === 1) {
          session.data.selected_color = uniqueColors[0]
          const product = variantProducts.find(p => p.color === uniqueColors[0])!
          session.data.product_price = product.price
          responseText = getConfirmMessage(session.data, product)
          useInteractiveButtons = true
          interactiveButtons = [
            { id: 'confirm_yes', title: '✅ Confirm Order' },
            { id: 'confirm_no', title: '❌ Cancel' },
          ]
          newState = 'confirm_product'
        } else {
          listBody = `🎨 *${selectedModel} ${selectedVariant}* - Color choose karein:`
          listButtonText = 'Select Color'
          listSections = [{
            title: 'Available Colors',
            rows: uniqueColors.map((c, i) => {
              const cp = variantProducts.find(p => p.color === c)
              return { id: `color_${i}`, title: c, description: cp ? formatPrice(cp.price) : '' }
            }),
          }]
          useInteractiveList = true
          session.data.colors = uniqueColors
          newState = 'choose_color'
        }
      } else {
        responseText = '❌ Variant nahi mila. List se select karein ya 0 for menu.'
      }
    }
    // ===== CHOOSE COLOR =====
    else if (session.state === 'choose_color') {
      const colorsList = (session.data.colors as string[]) || []
      const phoneType = (session.data.phone_type as string) || 'new'
      const selectedBrand = (session.data.selected_brand as string) || ''
      const selectedModel = (session.data.selected_model as string) || ''
      const selectedVariant = (session.data.selected_variant as string) || ''
      const selectedColor = resolveSelection(msg, originalMsg, replyId, 'color', colorsList)

      if (selectedColor) {
        session.data.selected_color = selectedColor
        const product = availableProducts.find(p =>
          p.brand.toLowerCase() === selectedBrand.toLowerCase() &&
          p.model.toLowerCase() === selectedModel.toLowerCase() &&
          p.variant.toLowerCase() === selectedVariant.toLowerCase() &&
          p.color.toLowerCase() === selectedColor.toLowerCase() &&
          p.type === phoneType
        )

        if (product) {
          session.data.product_price = product.price
          responseText = getConfirmMessage(session.data, product)
          useInteractiveButtons = true
          interactiveButtons = [
            { id: 'confirm_yes', title: '✅ Confirm Order' },
            { id: 'confirm_no', title: '❌ Cancel' },
          ]
          newState = 'confirm_product'
        } else {
          responseText = '❌ Product nahi mila. Try again ya 0 for menu.'
          newState = 'welcome'
        }
      } else {
        responseText = '❌ Color nahi mila. List se select karein ya 0 for menu.'
      }
    }
    // ===== CONFIRM PRODUCT =====
    else if (session.state === 'confirm_product') {
      const isConfirm = replyId === 'confirm_yes' || msg === 'confirm_yes' || msg.includes('✅ confirm order') || msg.includes('confirm') || msg.includes('yes') || msg.includes('haan') || msg.includes('ha')
      const isCancel = replyId === 'confirm_no' || msg === 'confirm_no' || msg.includes('❌ cancel') || msg.includes('cancel') || msg.includes('nahi')
      
      if (isConfirm) {
        responseText = '👤 *Aapka naam batayein:*\n\n_Full name likhein_'
        newState = 'collect_name'
      } else if (isCancel) {
        responseText = '❌ Order cancel kiya gaya.\n\n_Reply 0 for menu_'
        newState = 'welcome'
        session.data = {}
      } else {
        responseText = '✅ ya ❌ button dabayein.'
      }
    }
    // ===== COLLECT NAME =====
    else if (session.state === 'collect_name') {
      if (originalMsg.length < 2) {
        responseText = '❌ Kripya apna pura naam likhein.'
      } else {
        session.data.customer_name = originalMsg
        responseText = '🏙️ *Aapka city name batayein:*'
        newState = 'collect_city'
      }
    }
    // ===== COLLECT CITY =====
    else if (session.state === 'collect_city') {
      if (originalMsg.length < 2) {
        responseText = '❌ Kripya city name likhein.'
      } else {
        session.data.customer_city = originalMsg
        if (branches.length === 0) {
          responseText = '🏪 Koi branch available nahi hai. Admin se contact karein.\n\n_Reply 0 for menu_'
          newState = 'welcome'
        } else if (branches.length === 1) {
          session.data.selected_branch = branches[0].name
          session.data.branch_upi = branches[0].upi_id
          responseText = `📅 *Pickup date batayein:*\n\n_Format: DD/MM/YYYY (jaise 15/02/2026)_\n\nBranch: *${branches[0].name}*\n📍 ${branches[0].address}`
          newState = 'collect_pickup_date'
        } else {
          // Try to auto-match branch by city
          const cityMatch = branches.find(b => fuzzyMatch(originalMsg.toLowerCase(), b.city.toLowerCase()))
          if (cityMatch) {
            // Auto-select branch matching city
            session.data.selected_branch = cityMatch.name
            session.data.branch_upi = cityMatch.upi_id
            responseText = `📅 *Pickup date batayein:*\n\n_Format: DD/MM/YYYY (jaise 15/02/2026)_\n\nBranch: *${cityMatch.name}*\n📍 ${cityMatch.address}, ${cityMatch.city}`
            newState = 'collect_pickup_date'
          } else {
            // Show all branches as list with text fallback
            const branchTextList = branches.map((b, i) => `${i + 1}. *${b.name}*\n   📍 ${b.address}, ${b.city}`).join('\n\n')
            responseText = `🏪 *Pickup branch select karein:*\n\n${branchTextList}\n\n_Number type karein ya list se select karein_`
            listBody = '🏪 *Pickup branch select karein:*'
            listButtonText = 'Select Branch'
            listSections = [{
              title: 'Our Branches',
              rows: branches.map((b, i) => ({
                id: `branch_${i}`,
                title: b.name.substring(0, 24),
                description: `${b.address}, ${b.city}`.substring(0, 72),
              })),
            }]
            useInteractiveList = true
            session.data.branches_list = branches.map(b => b.name)
            newState = 'choose_branch'
          }
        }
      }
    }
    // ===== CHOOSE BRANCH =====
    else if (session.state === 'choose_branch') {
      const branchesList = (session.data.branches_list as string[]) || branches.map(b => b.name)
      let selectedBranchName = resolveSelection(msg, originalMsg, replyId, 'branch', branchesList)

      // Also try matching by number (1, 2, 3...)
      if (!selectedBranchName) {
        const numMatch = msg.match(/^(\d+)$/)
        if (numMatch) {
          const idx = parseInt(numMatch[1]) - 1
          if (idx >= 0 && idx < branchesList.length) {
            selectedBranchName = branchesList[idx]
          }
        }
      }

      // Also try matching by city name
      if (!selectedBranchName) {
        const cityMatchBranch = branches.find(b => fuzzyMatch(originalMsg.toLowerCase(), b.city.toLowerCase()))
        if (cityMatchBranch) {
          selectedBranchName = cityMatchBranch.name
        }
      }

      // Also try matching by partial branch name
      if (!selectedBranchName) {
        const partialMatch = branches.find(b => fuzzyMatch(originalMsg.toLowerCase(), b.name.toLowerCase()))
        if (partialMatch) {
          selectedBranchName = partialMatch.name
        }
      }

      if (selectedBranchName) {
        const branch = branches.find(b => b.name === selectedBranchName)!
        session.data.selected_branch = selectedBranchName
        session.data.branch_upi = branch.upi_id
        responseText = `📅 *Pickup date batayein:*\n\n_Format: DD/MM/YYYY (jaise 15/02/2026)_\n\nBranch: *${selectedBranchName}*\n📍 ${branch.address}`
        newState = 'collect_pickup_date'
      } else {
        const branchTextList = branches.map((b, i) => `${i + 1}. *${b.name}* - ${b.city}`).join('\n')
        responseText = `❌ Branch nahi mila. Kripya number type karein:\n\n${branchTextList}`
      }
    }
    // ===== COLLECT PICKUP DATE =====
    else if (session.state === 'collect_pickup_date') {
      const parsed = parseSimpleDate(originalMsg)
      if (!parsed) {
        responseText = '❌ Date format galat hai.\n\nDD/MM/YYYY likhein (jaise 15/02/2026)'
      } else {
        session.data.pickup_date = parsed
        const advMin = shop.advance_amount_min || 1000
        const advMax = shop.advance_amount_max || 2000
        const upi = (session.data.branch_upi as string) || shop.upi_id || ''

        let paymentMsg = `💰 *Order Finalize!*\n\n`
        paymentMsg += `Advance amount: *${formatPrice(advMin)} - ${formatPrice(advMax)}*\n\n`
        if (upi) {
          paymentMsg += `📱 *UPI ID:* \`${upi}\`\n\n`
        }
        paymentMsg += `✅ Payment karne ke baad screenshot bhejein.\n\n`
        paymentMsg += `_Screenshot send karein..._`
        responseText = paymentMsg
        newState = 'payment_screenshot'
      }
    }
    // ===== PAYMENT SCREENSHOT =====
    else if (session.state === 'payment_screenshot') {
      if (message_type === 'image' || message_type === 'document') {
        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`
        const orderRow = [
          orderId,
          session.data.customer_name as string || '',
          from_phone,
          session.data.customer_city as string || '',
          session.data.selected_branch as string || '',
          session.data.selected_brand as string || '',
          session.data.selected_model as string || '',
          session.data.selected_variant as string || '',
          session.data.selected_color as string || '',
          String(session.data.product_price || ''),
          session.data.phone_type as string || 'new',
          'Pending Verification',
          'Payment Received',
          new Date().toISOString().split('T')[0],
          session.data.pickup_date as string || '',
          '',
        ]

        await appendSheet(googleToken, shop.google_sheet_id, 'Orders!A:P', [orderRow])

        // Notify agent
        if (shop.agent_notify_phone) {
          const agentMsg = `🛒 *New Order!*\n\n` +
            `Order: *${orderId}*\n` +
            `Customer: *${session.data.customer_name}*\n` +
            `Phone: ${from_phone}\n` +
            `Product: ${session.data.selected_brand} ${session.data.selected_model} ${session.data.selected_variant} (${session.data.selected_color})\n` +
            `Type: ${session.data.phone_type}\n` +
            `Branch: ${session.data.selected_branch}\n` +
            `Pickup: ${session.data.pickup_date}\n\n` +
            `⚠️ Payment screenshot received. Please verify manually.`
          await sendWhatsAppMessage(phone_number_id, access_token, shop.agent_notify_phone, agentMsg)
        }

        responseText = `✅ *Order Placed Successfully!*\n\n` +
          `🆔 Order ID: *${orderId}*\n` +
          `📱 ${session.data.selected_brand} ${session.data.selected_model} ${session.data.selected_variant} (${session.data.selected_color})\n` +
          `🏪 Branch: ${session.data.selected_branch}\n` +
          `📅 Pickup: ${session.data.pickup_date}\n\n` +
          `⏳ Payment verification pending. Humara agent verify karke aapko update karega.\n\n` +
          `Thank you! 🙏\n_Reply 0 for menu_`
        newState = 'welcome'
        session.data = {}
      } else {
        responseText = '📸 Kripya payment ka *screenshot* ya *document* bhejein.'
      }
    }
    // ===== DEFAULT =====
    else {
      const searchResult = handleFreeTextSearch(msg, allProducts)
      if (searchResult) {
        responseText = searchResult.text
        newState = searchResult.newState || 'welcome'
        if (searchResult.data) session.data = { ...session.data, ...searchResult.data }
        if (searchResult.list) {
          useInteractiveList = true
          listBody = searchResult.list.body
          listButtonText = searchResult.list.button
          listSections = searchResult.list.sections
        }
      } else {
        responseText = getDefaultWelcome(shop.name, shop.language)
        useInteractiveButtons = true
        interactiveButtons = [
          { id: 'new_phone', title: '📱 New Phone' },
          { id: 'secondhand', title: '♻️ Second Hand' },
          { id: 'search', title: '🔍 Search Model' },
        ]
        newState = 'welcome'
      }
    }

    // Send response
    let waMessageId: string | undefined
    if (useInteractiveList && listSections.length > 0) {
      const result = await sendWhatsAppInteractiveList(phone_number_id, access_token, from_phone, listBody, listButtonText, listSections)
      if (result.success) {
        waMessageId = result.waMessageId
        await storeBotMessage(supabase, shop.user_id, null, whatsapp_number_id, from_phone, listBody, waMessageId)
      } else if (responseText) {
        // Fallback to text if list fails
        console.log('Interactive list failed, falling back to text')
        const fallbackResult = await sendWhatsAppMessage(phone_number_id, access_token, from_phone, responseText)
        waMessageId = fallbackResult.waMessageId
        await storeBotMessage(supabase, shop.user_id, null, whatsapp_number_id, from_phone, responseText, waMessageId)
      }
    } else if (useInteractiveButtons && interactiveButtons.length > 0) {
      const result = await sendWhatsAppInteractiveButtons(phone_number_id, access_token, from_phone, responseText, interactiveButtons)
      waMessageId = result.waMessageId
      await storeBotMessage(supabase, shop.user_id, null, whatsapp_number_id, from_phone, responseText, waMessageId)
    } else if (responseText) {
      const result = await sendWhatsAppMessage(phone_number_id, access_token, from_phone, responseText)
      waMessageId = result.waMessageId
      await storeBotMessage(supabase, shop.user_id, null, whatsapp_number_id, from_phone, responseText, waMessageId)
    }

    // Update session
    session.state = newState
    if (sessionRowId) {
      await supabase
        .from('automation_sessions')
        .update({ session_data: session, last_interaction_at: new Date().toISOString() })
        .eq('id', sessionRowId)
    }

    return new Response(JSON.stringify({ processed: true, state: newState }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Mobile shop bot error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ============ HELPER: FREE TEXT SEARCH ============
function handleFreeTextSearch(msg: string, products: Product[]): {
  text: string; newState?: string; data?: Record<string, unknown>;
  list?: { body: string; button: string; sections: { title: string; rows: { id: string; title: string; description?: string }[] }[] }
} | null {
  // Budget search
  const budgetMatch = msg.match(/(?:under|below|niche|andar|upto|tak|ke\s+andar)\s*(\d+)/i) ||
    msg.match(/(\d{4,6})\s*(?:ke\s+andar|niche|below|under|tak)/i) ||
    msg.match(/best\s+(?:phone|mobile)?\s*(?:under|below)?\s*(\d+)/i)
  if (budgetMatch) {
    const budget = parseInt(budgetMatch[1])
    const matching = products.filter(p => p.price <= budget && isProductAvailable(p))
    if (matching.length === 0) {
      return { text: `😔 ${formatPrice(budget)} ke under koi phone nahi mila.\n\n_Reply 0 for menu_` }
    }
    const sorted = matching.sort((a, b) => b.price - a.price).slice(0, 10)
    return {
      text: '',
      newState: 'choose_model',
      data: { phone_type: sorted[0].type, selected_brand: '', models: sorted.map(p => p.model) },
      list: {
        body: `💰 *Under ${formatPrice(budget)}* - ${matching.length} phones found:`,
        button: 'View Phones',
        sections: [{
          title: `Under ${formatPrice(budget)}`,
          rows: sorted.map((p, i) => ({
            id: `model_${i}`,
            title: `${p.brand} ${p.model}`,
            description: `${p.variant} | ${formatPrice(p.price)} | ${p.type}`,
          })),
        }],
      },
    }
  }

  // Brand search
  const uniqueBrands = getUniqueValues(products, 'brand')
  const matchedBrand = uniqueBrands.find(b => fuzzyMatch(msg, b.toLowerCase()))
  if (matchedBrand) {
    const brandProducts = products.filter(p => p.brand.toLowerCase() === matchedBrand.toLowerCase())
    const uniqueModels = getUniqueValues(brandProducts, 'model')
    return {
      text: '',
      newState: 'choose_model',
      data: { selected_brand: matchedBrand, phone_type: brandProducts[0].type, models: uniqueModels },
      list: {
        body: `📱 *${matchedBrand}* - ${uniqueModels.length} models:`,
        button: 'Select Model',
        sections: [{
          title: `${matchedBrand} Models`,
          rows: uniqueModels.map((m, i) => {
            const mp = brandProducts.filter(p => p.model === m)
            const availableCount = mp.filter(p => isProductAvailable(p)).length
            const minPrice = Math.min(...mp.map(p => p.price))
            const status = availableCount > 0 ? `From ${formatPrice(minPrice)}` : '⚠️ Currently Unavailable'
            return { id: `model_${i}`, title: m, description: status }
          }),
        }],
      },
    }
  }

  // Model search
  const allModels = products.map(p => ({ full: `${p.brand} ${p.model}`, model: p.model, brand: p.brand, type: p.type }))
  const matchedModel = allModels.find(m => fuzzyMatch(msg, m.model.toLowerCase()) || fuzzyMatch(msg, m.full.toLowerCase()))
  if (matchedModel) {
    const modelProducts = products.filter(p =>
      p.model.toLowerCase() === matchedModel.model.toLowerCase() &&
      p.brand.toLowerCase() === matchedModel.brand.toLowerCase()
    )
    const availableModelProducts = modelProducts.filter(p => isProductAvailable(p))
    const uniqueVariants = getUniqueValues(availableModelProducts, 'variant')
    
    if (uniqueVariants.length === 0) {
      // Model found but not available - still show it so choose_model handles the unavailability
      return {
        text: '',
        newState: 'choose_model',
        data: {
          selected_brand: matchedModel.brand,
          phone_type: matchedModel.type,
          models: [matchedModel.model],
        },
        list: {
          body: `📱 *${matchedModel.brand}* - Model:`,
          button: 'Select Model',
          sections: [{
            title: `${matchedModel.brand} Models`,
            rows: [{ id: 'model_0', title: matchedModel.model, description: '⚠️ Currently Unavailable' }],
          }],
        },
      }
    }
    
    return {
      text: '',
      newState: 'choose_variant',
      data: {
        selected_brand: matchedModel.brand,
        selected_model: matchedModel.model,
        phone_type: matchedModel.type,
        variants: uniqueVariants,
      },
      list: {
        body: `📱 *${matchedModel.brand} ${matchedModel.model}* - Variant select karein:`,
        button: 'Select Variant',
        sections: [{
          title: `${matchedModel.model} Variants`,
          rows: uniqueVariants.map((v, i) => {
            const vp = availableModelProducts.filter(p => p.variant === v)
            const minPrice = Math.min(...vp.map(p => p.price))
            return { id: `variant_${i}`, title: v, description: `From ${formatPrice(minPrice)}` }
          }),
        }],
      },
    }
  }

  return null
}

// ============ HELPERS ============
function getDefaultWelcome(shopName: string, language: string): string {
  if (language === 'hindi') {
    return `🙏 *${shopName}* में आपका स्वागत है!\n\nक्या आप नया मोबाइल देख रहे हैं, सेकंड हैंड, या आपको कोई ब्रांड/मॉडल चाहिए?\n\n1️⃣ नया फोन\n2️⃣ सेकंड हैंड\n3️⃣ सर्च करें`
  }
  if (language === 'english') {
    return `Welcome to *${shopName}*! 📱\n\nAre you looking for a new phone, second-hand, or searching for a specific brand/model?\n\n1️⃣ New Phone\n2️⃣ Second Hand\n3️⃣ Search Model`
  }
  return `🙏 *${shopName}* me aapka swagat hai!\n\nKya aap naya mobile dekh rahe hai, second hand, ya koi brand/model chahiye?\n\n1️⃣ New Phone\n2️⃣ Second Hand\n3️⃣ Search Model`
}

function getConfirmMessage(data: Record<string, unknown>, product: Product): string {
  return `✅ *Order Summary:*\n\n` +
    `📱 *${data.selected_brand} ${data.selected_model}*\n` +
    `📦 Variant: ${data.selected_variant}\n` +
    `🎨 Color: ${data.selected_color}\n` +
    `💰 Price: ${formatPrice(product.price)}\n` +
    `📋 Type: ${(data.phone_type as string) === 'new' ? 'New' : 'Second Hand'}\n\n` +
    `Kya aap order confirm karna chahte hai?`
}

function parseSimpleDate(input: string): string | null {
  const trimmed = input.trim()
  const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (match) {
    let [, day, month, year] = match
    if (year.length === 2) year = '20' + year
    const d = parseInt(day), m = parseInt(month), y = parseInt(year)
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2024) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
    }
  }
  return null
}

async function notifyAgent(
  shop: any, customerPhone: string, customerName: string, productQuery: string,
  phoneNumberId: string, accessToken: string, supabase: any
) {
  if (shop.agent_notify_phone) {
    const agentMsg = `⚠️ *Product Inquiry - Not Available*\n\n` +
      `Customer: *${customerName}*\n` +
      `Phone: ${customerPhone}\n` +
      `Looking for: *${productQuery}*\n\n` +
      `Please contact the customer and help them find an alternative.`
    await sendWhatsAppMessage(phoneNumberId, accessToken, shop.agent_notify_phone, agentMsg)
  }
}
