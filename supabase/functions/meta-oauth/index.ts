import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  phone_numbers?: {
    data: Array<{
      id: string;
      verified_name: string;
      display_phone_number: string;
      quality_rating: string;
      messaging_limit?: string;
    }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    const META_APP_ID = Deno.env.get('META_APP_ID')
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Meta app credentials not configured')
    }

    // Direct redirect to Meta OAuth - simple browser-based flow
    if (action === 'initiate') {
      const authHeader = req.headers.get('Authorization')
      let userId: string | null = null

      // Try to get user from auth header if present
      if (authHeader?.startsWith('Bearer ')) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const token = authHeader.replace('Bearer ', '')
        const { data: claimsData } = await supabase.auth.getUser(token)
        userId = claimsData?.user?.id || null
      }

      // For browser redirect, we use this function's URL as callback
      const callbackUri = `${url.origin}${url.pathname}`
      
      // State contains user ID (if available) and timestamp
      const state = btoa(JSON.stringify({ 
        user_id: userId,
        timestamp: Date.now(),
        return_url: url.searchParams.get('return_url') || '/'
      }))

      // Meta OAuth URL with WhatsApp Business Management scope
      const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
      authUrl.searchParams.set('client_id', META_APP_ID)
      authUrl.searchParams.set('redirect_uri', callbackUri)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging')
      authUrl.searchParams.set('response_type', 'code')

      // Redirect to Meta
      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders, 
          'Location': authUrl.toString() 
        },
      })
    }

    // Handle OAuth callback from Meta redirect
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    
    if (code && state) {
      // Verify state
      let stateData: { user_id: string | null; timestamp: number; return_url: string }
      try {
        stateData = JSON.parse(atob(state))
      } catch {
        throw new Error('Invalid state parameter')
      }

      // Check state is not too old (10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        throw new Error('State expired')
      }

      const callbackUri = `${url.origin}${url.pathname}`

      // Exchange code for access token
      const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', META_APP_ID)
      tokenUrl.searchParams.set('client_secret', META_APP_SECRET)
      tokenUrl.searchParams.set('redirect_uri', callbackUri)
      tokenUrl.searchParams.set('code', code)

      const tokenResponse = await fetch(tokenUrl.toString())
      const tokenData: MetaTokenResponse = await tokenResponse.json()

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Token exchange failed:', tokenData)
        const returnUrl = new URL(stateData.return_url, url.origin)
        returnUrl.searchParams.set('error', 'token_exchange_failed')
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': returnUrl.toString() }
        })
      }

      // Get long-lived token
      const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', META_APP_ID)
      longLivedUrl.searchParams.set('client_secret', META_APP_SECRET)
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

      const longLivedResponse = await fetch(longLivedUrl.toString())
      const longLivedData: MetaTokenResponse = await longLivedResponse.json()

      const accessToken = longLivedData.access_token || tokenData.access_token
      const expiresIn = longLivedData.expires_in || tokenData.expires_in

      // Get WhatsApp Business Accounts
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,verified_name,display_phone_number,quality_rating}}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const wabaData = await wabaResponse.json()

      if (!wabaResponse.ok) {
        console.error('Failed to fetch WABA:', wabaData)
        const returnUrl = new URL(stateData.return_url, url.origin)
        returnUrl.searchParams.set('error', 'waba_fetch_failed')
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': returnUrl.toString() }
        })
      }

      // If we don't have a user_id from state, we can't store - redirect with error
      if (!stateData.user_id) {
        const returnUrl = new URL(stateData.return_url, url.origin)
        returnUrl.searchParams.set('error', 'not_authenticated')
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': returnUrl.toString() }
        })
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      let numbersStored = 0

      // Extract phone numbers from all WABAs
      for (const business of wabaData.data || []) {
        for (const waba of business.owned_whatsapp_business_accounts?.data || []) {
          for (const phone of waba.phone_numbers?.data || []) {
            // Store each phone number in the database
            const { error } = await supabase.from('whatsapp_numbers').upsert({
              user_id: stateData.user_id,
              phone_number: phone.display_phone_number,
              display_name: phone.verified_name,
              waba_id: waba.id,
              phone_number_id: phone.id,
              access_token: accessToken,
              token_expires_at: expiresIn 
                ? new Date(Date.now() + expiresIn * 1000).toISOString() 
                : null,
              status: 'active',
              business_name: business.name,
              quality_rating: phone.quality_rating,
            }, { 
              onConflict: 'phone_number_id',
              ignoreDuplicates: false 
            })

            if (error) {
              console.error('Failed to store phone number:', error)
            } else {
              numbersStored++
            }
          }
        }
      }

      // Redirect back to app with success
      const returnUrl = new URL(stateData.return_url, url.origin)
      returnUrl.searchParams.set('success', 'true')
      returnUrl.searchParams.set('numbers', String(numbersStored))
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': returnUrl.toString() }
      })
    }

    // Generate OAuth URL for initiating the flow (API call version)
    if (action === 'get-auth-url') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
      
      if (claimsError || !claimsData.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const body = await req.json()
      const redirectUri = body.redirect_uri

      if (!redirectUri) {
        throw new Error('redirect_uri is required')
      }

      // State contains user ID for verification after callback
      const stateValue = btoa(JSON.stringify({ 
        user_id: claimsData.user.id,
        timestamp: Date.now() 
      }))

      // Meta OAuth URL with WhatsApp Business Management scope
      const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
      authUrl.searchParams.set('client_id', META_APP_ID)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', stateValue)
      authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging')
      authUrl.searchParams.set('response_type', 'code')

      return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle OAuth callback - exchange code for token
    if (action === 'callback') {
      const body = await req.json()
      const { code, redirect_uri, state } = body

      if (!code || !redirect_uri || !state) {
        throw new Error('Missing required parameters: code, redirect_uri, state')
      }

      // Verify state
      let stateData: { user_id: string; timestamp: number }
      try {
        stateData = JSON.parse(atob(state))
      } catch {
        throw new Error('Invalid state parameter')
      }

      // Check state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired')
      }

      // Exchange code for access token
      const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', META_APP_ID)
      tokenUrl.searchParams.set('client_secret', META_APP_SECRET)
      tokenUrl.searchParams.set('redirect_uri', redirect_uri)
      tokenUrl.searchParams.set('code', code)

      const tokenResponse = await fetch(tokenUrl.toString())
      const tokenData: MetaTokenResponse = await tokenResponse.json()

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Token exchange failed:', tokenData)
        throw new Error('Failed to exchange code for token')
      }

      // Get long-lived token
      const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', META_APP_ID)
      longLivedUrl.searchParams.set('client_secret', META_APP_SECRET)
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

      const longLivedResponse = await fetch(longLivedUrl.toString())
      const longLivedData: MetaTokenResponse = await longLivedResponse.json()

      const accessToken = longLivedData.access_token || tokenData.access_token
      const expiresIn = longLivedData.expires_in || tokenData.expires_in

      // Get WhatsApp Business Accounts
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,verified_name,display_phone_number,quality_rating}}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const wabaData = await wabaResponse.json()

      if (!wabaResponse.ok) {
        console.error('Failed to fetch WABA:', wabaData)
        throw new Error('Failed to fetch WhatsApp Business Accounts')
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const phoneNumbers: Array<{
        phone_number: string;
        display_name: string;
        waba_id: string;
        phone_number_id: string;
        quality_rating: string;
      }> = []

      // Extract phone numbers from all WABAs
      for (const business of wabaData.data || []) {
        for (const waba of business.owned_whatsapp_business_accounts?.data || []) {
          for (const phone of waba.phone_numbers?.data || []) {
            // Store each phone number in the database
            const { error } = await supabase.from('whatsapp_numbers').upsert({
              user_id: stateData.user_id,
              phone_number: phone.display_phone_number,
              display_name: phone.verified_name,
              waba_id: waba.id,
              phone_number_id: phone.id,
              access_token: accessToken,
              token_expires_at: expiresIn 
                ? new Date(Date.now() + expiresIn * 1000).toISOString() 
                : null,
              status: 'active',
              business_name: business.name,
              quality_rating: phone.quality_rating,
            }, { 
              onConflict: 'phone_number_id',
              ignoreDuplicates: false 
            })

            if (error) {
              console.error('Failed to store phone number:', error)
            }

            phoneNumbers.push({
              phone_number: phone.display_phone_number,
              display_name: phone.verified_name,
              waba_id: waba.id,
              phone_number_id: phone.id,
              quality_rating: phone.quality_rating,
            })
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        phone_numbers: phoneNumbers 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Refresh token endpoint
    if (action === 'refresh-token') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
      
      if (claimsError || !claimsData.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const body = await req.json()
      const { whatsapp_number_id } = body

      // Get current token
      const { data: numberData, error: fetchError } = await supabase
        .from('whatsapp_numbers')
        .select('access_token')
        .eq('id', whatsapp_number_id)
        .eq('user_id', claimsData.user.id)
        .single()

      if (fetchError || !numberData) {
        throw new Error('WhatsApp number not found')
      }

      // Refresh the token
      const refreshUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      refreshUrl.searchParams.set('grant_type', 'fb_exchange_token')
      refreshUrl.searchParams.set('client_id', META_APP_ID)
      refreshUrl.searchParams.set('client_secret', META_APP_SECRET)
      refreshUrl.searchParams.set('fb_exchange_token', numberData.access_token)

      const refreshResponse = await fetch(refreshUrl.toString())
      const refreshData: MetaTokenResponse = await refreshResponse.json()

      if (!refreshResponse.ok || !refreshData.access_token) {
        throw new Error('Failed to refresh token')
      }

      // Update token in database
      await supabase.from('whatsapp_numbers').update({
        access_token: refreshData.access_token,
        token_expires_at: refreshData.expires_in 
          ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString() 
          : null,
        updated_at: new Date().toISOString(),
      }).eq('id', whatsapp_number_id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Meta OAuth error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
