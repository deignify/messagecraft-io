import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const authHeader = req.headers.get('Authorization')

// Allow Lovable sync / health check
if (!authHeader) {
  return new Response(
    JSON.stringify({ ok: true, sync: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}


interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    example?: { body_text?: string[][] };
    buttons?: Array<{ type: string; text: string; url?: string }>;
  }>;
}

interface MetaTemplatesResponse {
  data: MetaTemplate[];
  paging?: { cursors?: { after?: string }; next?: string };
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

    let body: any = {}
try {
  body = await req.json()
} catch {
  body = {}
}

    const { whatsapp_number_id } = body

    if (!whatsapp_number_id) {
      throw new Error('whatsapp_number_id is required')
    }

    // Get WhatsApp number details
    const { data: waNumber, error: waError } = await supabase
      .from('whatsapp_numbers')
      .select('waba_id, access_token, id')
      .eq('id', whatsapp_number_id)
      .eq('user_id', userData.user.id)
      .single()

    if (waError || !waNumber) {
      throw new Error('WhatsApp number not found or access denied')
    }

    // Fetch templates from Meta API
    let allTemplates: MetaTemplate[] = []
    let nextUrl: string | null = `https://graph.facebook.com/v21.0/${waNumber.waba_id}/message_templates?fields=id,name,language,status,category,components&limit=100`

    let pageCount = 0

while (nextUrl && pageCount < 5) {
  pageCount++
  ...
}


      if (!response.ok) {
        const errorData = await response.json()
        console.error('Meta API error:', errorData)
        throw new Error(errorData.error?.message || 'Failed to fetch templates')
      }

      const data: MetaTemplatesResponse = await response.json()
      allTemplates = allTemplates.concat(data.data || [])
      nextUrl = data.paging?.next || null
    }

    // Map status values to our enum
    const statusMap: Record<string, string> = {
      'APPROVED': 'APPROVED',
      'PENDING': 'PENDING',
      'REJECTED': 'REJECTED',
      'DISABLED': 'DISABLED',
      'PAUSED': 'PAUSED',
      'LIMIT_EXCEEDED': 'LIMIT_EXCEEDED',
    }

    const categoryMap: Record<string, string> = {
      'AUTHENTICATION': 'AUTHENTICATION',
      'MARKETING': 'MARKETING',
      'UTILITY': 'UTILITY',
    }

    // Upsert templates
    const templates = allTemplates.map(template => ({
      user_id: userData.user.id,
      whatsapp_number_id: whatsapp_number_id,
      meta_template_id: template.id,
      name: template.name,
      language: template.language,
      category: categoryMap[template.category] || 'UTILITY',
      status: statusMap[template.status] || 'PENDING',
      components: template.components,
      last_synced_at: new Date().toISOString(),
    }))

    // Delete templates that no longer exist in Meta
    const metaTemplateIds = allTemplates.map(t => t.id)
    await supabase
      .from('templates')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('whatsapp_number_id', whatsapp_number_id)
      .not('meta_template_id', 'in', `(${metaTemplateIds.join(',')})`)

    // Upsert all templates using composite unique key
    for (const template of templates) {
      const { error } = await supabase
        .from('templates')
        .upsert(template, {
          onConflict: 'whatsapp_number_id,meta_template_id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error('Failed to upsert template:', template.name, error)
      }
    }

    // Fetch updated templates from database
    const { data: syncedTemplates } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('whatsapp_number_id', whatsapp_number_id)
      .order('name')

    return new Response(JSON.stringify({ 
      success: true, 
      synced_count: templates.length,
      templates: syncedTemplates,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync templates error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
