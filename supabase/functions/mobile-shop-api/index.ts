import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
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

async function readSheet(accessToken: string, sheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await res.json()
  if (!res.ok) { console.error('Sheets read error:', data); return [] }
  return data.values || []
}

async function writeSheet(accessToken: string, sheetId: string, range: string, values: string[][]): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) { console.error('Sheets write error:', await res.json()); return false }
  return true
}

async function appendSheet(accessToken: string, sheetId: string, range: string, values: string[][]): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) { console.error('Sheets append error:', await res.json()); return false }
  return true
}

async function ensureSheet(accessToken: string, sheetId: string, sheetName: string): Promise<boolean> {
  // Check if sheet exists
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await res.json()
  const exists = data.sheets?.some((s: any) => s.properties?.title === sheetName)
  if (exists) return true

  // Create the sheet
  const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }]
    }),
  })
  return addRes.ok
}

async function updateSheetRow(accessToken: string, sheetId: string, sheetName: string, rowIndex: number, values: string[]): Promise<boolean> {
  const range = `${sheetName}!A${rowIndex + 1}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  })
  if (!res.ok) { console.error('Row update error:', await res.json()); return false }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const GOOGLE_SA_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = userData.user.id

    const body = await req.json()
    const { action, whatsapp_number_id } = body

    // Get shop
    const { data: shop } = await supabase
      .from('mobile_shops')
      .select('*')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!shop) {
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!shop.google_sheet_id) {
      return new Response(JSON.stringify({ error: 'No Google Sheet configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!GOOGLE_SA_KEY) {
      return new Response(JSON.stringify({ error: 'Google service account not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const googleToken = await getGoogleAccessToken(GOOGLE_SA_KEY)

    // ===== SYNC SHOP DETAILS TO SHEET =====
    if (action === 'sync-shop-details') {
      await ensureSheet(googleToken, shop.google_sheet_id, 'ShopDetails')
      const shopData = [
        ['Setting', 'Value'],
        ['Shop Name', shop.name || ''],
        ['Description', shop.description || ''],
        ['Language', shop.language || 'hinglish'],
        ['Owner Phone', shop.owner_phone || ''],
        ['Agent Notify Phone', shop.agent_notify_phone || ''],
        ['UPI ID', shop.upi_id || ''],
        ['Advance Min', String(shop.advance_amount_min || 1000)],
        ['Advance Max', String(shop.advance_amount_max || 2000)],
        ['Welcome Message', shop.welcome_message || ''],
        ['Is Active', shop.is_active ? 'Yes' : 'No'],
        ['WhatsApp Number ID', shop.whatsapp_number_id],
      ]
      await writeSheet(googleToken, shop.google_sheet_id, 'ShopDetails!A1', shopData)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== GET SHOP DETAILS FROM SHEET =====
    if (action === 'get-shop-details') {
      const rows = await readSheet(googleToken, shop.google_sheet_id, 'ShopDetails!A:B')
      const details: Record<string, string> = {}
      rows.slice(1).forEach(row => {
        if (row[0]) details[row[0]] = (row[1] || '').trim()
      })
      return new Response(JSON.stringify({ details }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== UPDATE SHOP DETAILS IN SHEET =====
    if (action === 'update-shop-details') {
      const { settings } = body
      if (!settings || typeof settings !== 'object') {
        return new Response(JSON.stringify({ error: 'settings object required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      await ensureSheet(googleToken, shop.google_sheet_id, 'ShopDetails')
      const shopData = [
        ['Setting', 'Value'],
        ['Shop Name', settings.name || shop.name || ''],
        ['Description', settings.description || shop.description || ''],
        ['Language', settings.language || shop.language || 'hinglish'],
        ['Owner Phone', settings.owner_phone || shop.owner_phone || ''],
        ['Agent Notify Phone', settings.agent_notify_phone || shop.agent_notify_phone || ''],
        ['UPI ID', settings.upi_id || shop.upi_id || ''],
        ['Advance Min', String(settings.advance_amount_min || shop.advance_amount_min || 1000)],
        ['Advance Max', String(settings.advance_amount_max || shop.advance_amount_max || 2000)],
        ['Welcome Message', settings.welcome_message || shop.welcome_message || ''],
        ['Is Active', (settings.is_active !== undefined ? settings.is_active : shop.is_active) ? 'Yes' : 'No'],
        ['WhatsApp Number ID', shop.whatsapp_number_id],
      ]
      await writeSheet(googleToken, shop.google_sheet_id, 'ShopDetails!A1', shopData)
      
      // Also update DB
      const dbUpdate: Record<string, unknown> = {}
      if (settings.name) dbUpdate.name = settings.name
      if (settings.description !== undefined) dbUpdate.description = settings.description
      if (settings.language) dbUpdate.language = settings.language
      if (settings.owner_phone !== undefined) dbUpdate.owner_phone = settings.owner_phone
      if (settings.agent_notify_phone !== undefined) dbUpdate.agent_notify_phone = settings.agent_notify_phone
      if (settings.upi_id !== undefined) dbUpdate.upi_id = settings.upi_id
      if (settings.advance_amount_min !== undefined) dbUpdate.advance_amount_min = settings.advance_amount_min
      if (settings.advance_amount_max !== undefined) dbUpdate.advance_amount_max = settings.advance_amount_max
      if (settings.welcome_message !== undefined) dbUpdate.welcome_message = settings.welcome_message
      
      if (Object.keys(dbUpdate).length > 0) {
        await supabase.from('mobile_shops').update(dbUpdate).eq('id', shop.id)
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== GET BRANCHES FROM SHEET =====
    if (action === 'get-branches') {
      const rows = await readSheet(googleToken, shop.google_sheet_id, 'Branches!A:F')
      const branches = rows.slice(1).map((row, i) => ({
        index: i + 2, // 1-indexed row in sheet (header is row 1)
        name: (row[0] || '').trim(),
        address: (row[1] || '').trim(),
        city: (row[2] || '').trim(),
        contact_phone: (row[3] || '').trim(),
        upi_id: (row[4] || '').trim(),
        is_active: (row[5] || 'Yes').trim(),
      })).filter(b => b.name)
      return new Response(JSON.stringify({ branches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== GET PRODUCTS FROM SHEET =====
    if (action === 'get-products') {
      const rows = await readSheet(googleToken, shop.google_sheet_id, 'Products!A:H')
      const products = rows.slice(1).map((row, i) => ({
        index: i + 2,
        brand: (row[0] || '').trim(),
        model: (row[1] || '').trim(),
        variant: (row[2] || '').trim(),
        color: (row[3] || '').trim(),
        price: row[4] || '0',
        stock: row[5] || '0',
        type: (row[6] || 'new').trim(),
        available: (row[7] || 'Yes').trim(),
      })).filter(p => p.brand && p.model)
      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== GET ORDERS FROM SHEET =====
    if (action === 'get-orders') {
      const rows = await readSheet(googleToken, shop.google_sheet_id, 'Orders!A:P')
      const orders = rows.slice(1).map((row, i) => ({
        index: i + 2,
        order_id: (row[0] || '').trim(),
        name: (row[1] || '').trim(),
        phone: (row[2] || '').trim(),
        city: (row[3] || '').trim(),
        branch: (row[4] || '').trim(),
        brand: (row[5] || '').trim(),
        model: (row[6] || '').trim(),
        variant: (row[7] || '').trim(),
        color: (row[8] || '').trim(),
        price: (row[9] || '0').trim(),
        type: (row[10] || '').trim(),
        payment_status: (row[11] || '').trim(),
        order_status: (row[12] || '').trim(),
        date: (row[13] || '').trim(),
        pickup_date: (row[14] || '').trim(),
        notes: (row[15] || '').trim(),
      })).filter(o => o.order_id)
      return new Response(JSON.stringify({ orders }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== UPDATE ORDER STATUS =====
    if (action === 'update-order') {
      const { row_index, values } = body
      if (!row_index || !values) {
        return new Response(JSON.stringify({ error: 'row_index and values required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const success = await updateSheetRow(googleToken, shop.google_sheet_id, 'Orders', row_index - 1, values)
      
      // Send WhatsApp notification to customer about status change
      if (success && values.length >= 13) {
        const customerPhone = values[2] // phone column
        const orderStatus = values[12] // order_status column
        const orderId = values[0]
        const productName = `${values[5]} ${values[6]} ${values[7]}` // brand model variant
        const branch = values[4]
        const pickupDate = values[14] || ''
        
        if (customerPhone && orderStatus) {
          // Get WhatsApp number credentials
          const { data: waNumber } = await supabase
            .from('whatsapp_numbers')
            .select('phone_number_id, access_token')
            .eq('id', shop.whatsapp_number_id)
            .single()
          
          if (waNumber) {
            let customerMsg = ''
            const statusLower = orderStatus.toLowerCase()
            
            if (statusLower === 'confirmed') {
              customerMsg = `✅ *Order Confirmed!*\n\n` +
                `🆔 Order: *${orderId}*\n` +
                `📱 Product: *${productName}*\n` +
                `🏪 Branch: *${branch}*\n` +
                `📅 Pickup: ${pickupDate}\n\n` +
                `Aapka order confirm ho gaya hai! Pickup date pe branch pe aayein. 🙏\n\n` +
                `Thank you for your order!`
            } else if (statusLower === 'delivered') {
              customerMsg = `📦 *Order Delivered!*\n\n` +
                `🆔 Order: *${orderId}*\n` +
                `📱 Product: *${productName}*\n\n` +
                `Aapka order successfully deliver ho gaya hai! 🎉\n\n` +
                `Thank you for choosing us! 🙏`
            } else if (statusLower === 'cancelled') {
              customerMsg = `❌ *Order Cancelled*\n\n` +
                `🆔 Order: *${orderId}*\n` +
                `📱 Product: *${productName}*\n\n` +
                `Aapka order cancel kar diya gaya hai.\n` +
                `Agar koi sawaal hai to humse contact karein. 🙏`
            }
            
            if (customerMsg) {
              try {
                await fetch(
                  `https://graph.facebook.com/v23.0/${waNumber.phone_number_id}/messages`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${waNumber.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: customerPhone,
                      type: 'text',
                      text: { body: customerMsg },
                    }),
                  }
                )
              } catch (notifyErr) {
                console.error('Customer notification error:', notifyErr)
              }
            }
          }
        }
      }
      
      return new Response(JSON.stringify({ success }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Mobile shop API error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
