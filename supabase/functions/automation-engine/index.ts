import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationRequest {
  action: 'create' | 'update' | 'delete' | 'toggle' | 'test' | 'get-sessions';
  automation_id?: string;
  whatsapp_number_id?: string;
  automation?: {
    name: string;
    trigger_type: 'first_message' | 'keyword' | 'always';
    trigger_keywords?: string[];
    is_active?: boolean;
    priority?: number;
    steps?: Array<{
      step_order: number;
      step_type: 'message' | 'menu' | 'condition' | 'delay' | 'assign';
      message_content?: string;
      menu_options?: { options: Array<{ id: string; title: string }> };
      condition_rules?: { conditions: Array<{ keyword: string; next_step_id: string }> };
      delay_seconds?: number;
    }>;
  };
  test_phone?: string;
  test_message?: string;
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

    const body: AutomationRequest = await req.json()
    const { action, automation_id, whatsapp_number_id, automation, test_phone, test_message } = body

    switch (action) {
      case 'create': {
        if (!whatsapp_number_id || !automation) {
          throw new Error('whatsapp_number_id and automation are required')
        }

        // Verify ownership of the WhatsApp number
        const { data: waNumber } = await supabase
          .from('whatsapp_numbers')
          .select('id')
          .eq('id', whatsapp_number_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!waNumber) {
          throw new Error('WhatsApp number not found or access denied')
        }

        // Create automation
        const { data: newAutomation, error: createError } = await supabase
          .from('automations')
          .insert({
            user_id: userData.user.id,
            whatsapp_number_id: whatsapp_number_id,
            name: automation.name,
            trigger_type: automation.trigger_type,
            trigger_keywords: automation.trigger_keywords || [],
            is_active: automation.is_active ?? true,
            priority: automation.priority ?? 0,
          })
          .select()
          .single()

        if (createError) throw createError

        // Create steps if provided
        if (automation.steps?.length) {
          const steps = automation.steps.map(step => ({
            automation_id: newAutomation.id,
            step_order: step.step_order,
            step_type: step.step_type,
            message_content: step.message_content,
            menu_options: step.menu_options,
            condition_rules: step.condition_rules,
            delay_seconds: step.delay_seconds,
          }))

          const { error: stepsError } = await supabase
            .from('automation_steps')
            .insert(steps)

          if (stepsError) {
            console.error('Failed to create steps:', stepsError)
          }

          // Link steps together (set next_step_id)
          const { data: createdSteps } = await supabase
            .from('automation_steps')
            .select('id, step_order')
            .eq('automation_id', newAutomation.id)
            .order('step_order')

          if (createdSteps && createdSteps.length > 1) {
            for (let i = 0; i < createdSteps.length - 1; i++) {
              await supabase
                .from('automation_steps')
                .update({ next_step_id: createdSteps[i + 1].id })
                .eq('id', createdSteps[i].id)
            }
          }
        }

        // Fetch complete automation with steps
        const { data: completeAutomation } = await supabase
          .from('automations')
          .select(`
            *,
            automation_steps (*)
          `)
          .eq('id', newAutomation.id)
          .single()

        return new Response(JSON.stringify({ 
          success: true, 
          automation: completeAutomation 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update': {
        if (!automation_id || !automation) {
          throw new Error('automation_id and automation are required')
        }

        // Verify ownership
        const { data: existingAutomation } = await supabase
          .from('automations')
          .select('id')
          .eq('id', automation_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!existingAutomation) {
          throw new Error('Automation not found or access denied')
        }

        // Update automation
        const { error: updateError } = await supabase
          .from('automations')
          .update({
            name: automation.name,
            trigger_type: automation.trigger_type,
            trigger_keywords: automation.trigger_keywords,
            is_active: automation.is_active,
            priority: automation.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', automation_id)

        if (updateError) throw updateError

        // Update steps if provided
        if (automation.steps) {
          // Delete existing steps
          await supabase
            .from('automation_steps')
            .delete()
            .eq('automation_id', automation_id)

          // Create new steps
          if (automation.steps.length) {
            const steps = automation.steps.map(step => ({
              automation_id: automation_id,
              step_order: step.step_order,
              step_type: step.step_type,
              message_content: step.message_content,
              menu_options: step.menu_options,
              condition_rules: step.condition_rules,
              delay_seconds: step.delay_seconds,
            }))

            await supabase.from('automation_steps').insert(steps)

            // Link steps
            const { data: createdSteps } = await supabase
              .from('automation_steps')
              .select('id, step_order')
              .eq('automation_id', automation_id)
              .order('step_order')

            if (createdSteps && createdSteps.length > 1) {
              for (let i = 0; i < createdSteps.length - 1; i++) {
                await supabase
                  .from('automation_steps')
                  .update({ next_step_id: createdSteps[i + 1].id })
                  .eq('id', createdSteps[i].id)
              }
            }
          }
        }

        // Fetch updated automation
        const { data: updatedAutomation } = await supabase
          .from('automations')
          .select(`*, automation_steps (*)`)
          .eq('id', automation_id)
          .single()

        return new Response(JSON.stringify({ 
          success: true, 
          automation: updatedAutomation 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete': {
        if (!automation_id) {
          throw new Error('automation_id is required')
        }

        // Verify ownership
        const { data: existingAutomation } = await supabase
          .from('automations')
          .select('id')
          .eq('id', automation_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!existingAutomation) {
          throw new Error('Automation not found or access denied')
        }

        // Delete steps first (cascade should handle this, but being explicit)
        await supabase
          .from('automation_steps')
          .delete()
          .eq('automation_id', automation_id)

        // Delete sessions
        await supabase
          .from('automation_sessions')
          .delete()
          .eq('automation_id', automation_id)

        // Delete automation
        const { error: deleteError } = await supabase
          .from('automations')
          .delete()
          .eq('id', automation_id)

        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'toggle': {
        if (!automation_id) {
          throw new Error('automation_id is required')
        }

        // Verify ownership and get current state
        const { data: existingAutomation } = await supabase
          .from('automations')
          .select('id, is_active')
          .eq('id', automation_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!existingAutomation) {
          throw new Error('Automation not found or access denied')
        }

        // Toggle active state
        const { data: updatedAutomation, error: toggleError } = await supabase
          .from('automations')
          .update({ 
            is_active: !existingAutomation.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', automation_id)
          .select()
          .single()

        if (toggleError) throw toggleError

        return new Response(JSON.stringify({ 
          success: true, 
          automation: updatedAutomation 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'test': {
        if (!automation_id || !test_phone || !test_message) {
          throw new Error('automation_id, test_phone, and test_message are required')
        }

        // Get automation with steps
        const { data: testAutomation } = await supabase
          .from('automations')
          .select(`
            *,
            automation_steps (*),
            whatsapp_numbers!inner (id, phone_number_id, access_token)
          `)
          .eq('id', automation_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!testAutomation) {
          throw new Error('Automation not found or access denied')
        }

        // Simulate the automation flow
        const simulationResults: Array<{
          step_order: number;
          step_type: string;
          action: string;
          content?: string;
        }> = []

        const steps = testAutomation.automation_steps.sort(
          (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
        )

        for (const step of steps) {
          switch (step.step_type) {
            case 'message':
              simulationResults.push({
                step_order: step.step_order,
                step_type: 'message',
                action: 'Would send message',
                content: step.message_content,
              })
              break
            case 'menu':
              simulationResults.push({
                step_order: step.step_order,
                step_type: 'menu',
                action: 'Would show menu',
                content: JSON.stringify(step.menu_options),
              })
              break
            case 'delay':
              simulationResults.push({
                step_order: step.step_order,
                step_type: 'delay',
                action: `Would wait ${step.delay_seconds} seconds`,
              })
              break
            case 'condition':
              simulationResults.push({
                step_order: step.step_order,
                step_type: 'condition',
                action: 'Would evaluate condition',
                content: JSON.stringify(step.condition_rules),
              })
              break
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          test_results: {
            automation: testAutomation.name,
            trigger_type: testAutomation.trigger_type,
            would_trigger: checkTriggerCondition(testAutomation, test_message),
            simulation: simulationResults,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get-sessions': {
        if (!automation_id) {
          throw new Error('automation_id is required')
        }

        // Verify ownership
        const { data: automationData } = await supabase
          .from('automations')
          .select('id')
          .eq('id', automation_id)
          .eq('user_id', userData.user.id)
          .single()

        if (!automationData) {
          throw new Error('Automation not found or access denied')
        }

        const { data: sessions } = await supabase
          .from('automation_sessions')
          .select('*')
          .eq('automation_id', automation_id)
          .order('started_at', { ascending: false })
          .limit(100)

        return new Response(JSON.stringify({ 
          success: true, 
          sessions 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Automation engine error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function checkTriggerCondition(
  automation: { trigger_type: string; trigger_keywords: string[] },
  message: string
): boolean {
  if (automation.trigger_type === 'always') return true
  if (automation.trigger_type === 'first_message') return true // Assume test is first message
  if (automation.trigger_type === 'keyword') {
    const lowerMessage = message.toLowerCase()
    return automation.trigger_keywords.some(kw => 
      lowerMessage.includes(kw.toLowerCase())
    )
  }
  return false
}
