import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action, whatsapp_number_id, template_name, template_id } = body

    if (!whatsapp_number_id || !action) {
      throw new Error('whatsapp_number_id and action are required')
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

    if (action === 'delete') {
      // Delete template from Meta API
      // Meta requires the template name to delete
      if (!template_name) {
        throw new Error('template_name is required for delete action')
      }

      console.log(`Deleting template "${template_name}" from Meta WABA ${waNumber.waba_id}`)

      const response = await fetch(
        `https://graph.facebook.com/v23.0/${waNumber.waba_id}/message_templates?name=${encodeURIComponent(template_name)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${waNumber.access_token}`,
          },
        }
      )

      const responseData = await response.json()

      if (!response.ok) {
        console.error('Meta API delete error:', responseData)
        throw new Error(responseData.error?.error_user_msg || responseData.error?.message || 'Failed to delete template from Meta')
      }

      console.log('Meta API delete success:', responseData)

      // Delete from local templates table
      if (template_id) {
        await supabase
          .from('templates')
          .delete()
          .eq('id', template_id)
          .eq('user_id', userData.user.id)
      }

      // Also delete from message_templates if exists
      await supabase
        .from('message_templates')
        .update({ is_deleted: true })
        .eq('template_name', template_name)
        .eq('whatsapp_number_id', whatsapp_number_id)
        .eq('user_id', userData.user.id)

      return new Response(JSON.stringify({
        success: true,
        message: `Template "${template_name}" deleted from Meta`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'edit') {
      // Meta doesn't support direct editing of templates
      // The process is: delete old template, then create new one
      // But only APPROVED, PAUSED, or REJECTED templates can be deleted
      // For now, we handle this by deleting and recreating via submit-template

      if (!template_name || !template_id) {
        throw new Error('template_name and template_id are required for edit action')
      }

      // First delete the old template from Meta
      console.log(`Editing template: deleting old "${template_name}" from Meta`)

      const deleteResponse = await fetch(
        `https://graph.facebook.com/v23.0/${waNumber.waba_id}/message_templates?name=${encodeURIComponent(template_name)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${waNumber.access_token}`,
          },
        }
      )

      const deleteData = await deleteResponse.json()

      if (!deleteResponse.ok) {
        console.error('Meta API delete for edit error:', deleteData)
        // If template doesn't exist on Meta, continue anyway
        if (deleteData.error?.code !== 100) {
          throw new Error(deleteData.error?.error_user_msg || deleteData.error?.message || 'Failed to delete old template from Meta')
        }
      }

      // Delete from local templates table
      await supabase
        .from('templates')
        .delete()
        .eq('id', template_id)
        .eq('user_id', userData.user.id)

      console.log('Old template deleted, ready for re-creation')

      return new Response(JSON.stringify({
        success: true,
        message: 'Old template deleted from Meta. Create a new template with updated content.',
        action: 'recreate',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Manage template error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})