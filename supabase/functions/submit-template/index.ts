import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SubmitTemplateSchema = z.object({
  template_id: z.string().uuid(),
  whatsapp_number_id: z.string().uuid(),
}).strict()

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  buttons?: TemplateButton[];
  example?: any;
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
    const parseResult = SubmitTemplateSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { template_id, whatsapp_number_id } = parseResult.data

    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .eq('user_id', userData.user.id)
      .single()

    if (templateError || !template) {
      throw new Error('Template not found or access denied')
    }

    // Get WhatsApp number details
    const { data: waNumber, error: waError } = await supabase
      .from('whatsapp_numbers')
      .select('waba_id, access_token')
      .eq('id', whatsapp_number_id)
      .eq('user_id', userData.user.id)
      .single()

    if (waError || !waNumber) {
      throw new Error('WhatsApp number not found or access denied')
    }

    // Build Meta API template components
    const components: TemplateComponent[] = []

    // Add header if present
    if (template.header_type !== 'none') {
      if (template.header_type === 'text' && template.header_text) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: template.header_text,
        })
      } else if (template.header_type === 'location') {
        components.push({
          type: 'HEADER',
          format: 'LOCATION',
        })
      } else if (['image', 'video', 'document'].includes(template.header_type)) {
        const headerComponent: TemplateComponent = {
          type: 'HEADER',
          format: template.header_type.toUpperCase() as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
        }
        // Add example media URL if provided
        if (template.header_media_url) {
          headerComponent.example = {
            header_handle: [template.header_media_url]
          }
        }
        components.push(headerComponent)
      }
    }

    // Add body (required) - include example values for variables
    const bodyComponent: any = {
      type: 'BODY',
      text: template.body_text,
    }

    // Extract variables from body text and add example values
    const variableRegex = /\{\{(\d+)\}\}/g
    const variableMatches = [...template.body_text.matchAll(variableRegex)]
    const variables = template.variables as Record<string, string> | null

    if (variableMatches.length > 0) {
      // Sort by variable number to ensure correct order
      const sortedVars = variableMatches
        .map(m => m[1])
        .sort((a, b) => parseInt(a) - parseInt(b))

      const exampleValues = sortedVars.map(key => {
        // Use provided sample value or generate a default
        if (variables && variables[key] && variables[key].trim()) {
          return variables[key]
        }
        // Default example values if none provided
        return `sample_${key}`
      })

      bodyComponent.example = {
        body_text: [exampleValues]
      }
    }

    components.push(bodyComponent)

    // Add footer if present
    if (template.footer_text) {
      components.push({
        type: 'FOOTER',
        text: template.footer_text,
      })
    }

    // Add buttons if present
    const buttons = template.buttons as any[] | null
    if (buttons && buttons.length > 0) {
      const metaButtons: TemplateButton[] = buttons.map((btn: any) => {
        if (btn.type === 'quick_reply') {
          return { type: 'QUICK_REPLY' as const, text: btn.text }
        } else if (btn.type === 'url') {
          return { type: 'URL' as const, text: btn.text, url: btn.url }
        } else if (btn.type === 'phone_number') {
          return { type: 'PHONE_NUMBER' as const, text: btn.text, phone_number: btn.phone_number }
        } else if (btn.type === 'copy_code') {
          const copyBtn: any = { type: 'COPY_CODE' as const, example: btn.example ? [btn.example] : ['CODE123'] }
          return copyBtn
        }
        return { type: 'QUICK_REPLY' as const, text: btn.text }
      })

      components.push({
        type: 'BUTTONS',
        buttons: metaButtons,
      })
    }

    // Map category to Meta API format
    const categoryMap: Record<string, string> = {
      'marketing': 'MARKETING',
      'utility': 'UTILITY',
      'authentication': 'AUTHENTICATION',
    }

    // Submit template to Meta API
    const metaPayload = {
      name: template.template_name,
      language: template.language,
      category: categoryMap[template.category] || 'UTILITY',
      components,
    }

    console.log('Submitting template to Meta:', JSON.stringify(metaPayload, null, 2))

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${waNumber.waba_id}/message_templates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waNumber.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      }
    )

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Meta API error:', responseData)
      
      // Update template status to rejected with error message
      await supabase
        .from('message_templates')
        .update({ 
          status: 'rejected',
        })
        .eq('id', template_id)

      throw new Error(responseData.error?.message || 'Failed to submit template to Meta')
    }

    console.log('Meta API success:', responseData)

    // Update template status to pending (Meta will review)
    await supabase
      .from('message_templates')
      .update({ 
        status: 'pending',
      })
      .eq('id', template_id)

    return new Response(JSON.stringify({ 
      success: true,
      meta_template_id: responseData.id,
      status: responseData.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Submit template error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
