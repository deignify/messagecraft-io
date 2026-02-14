import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com/v23.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case "create":
        result = await createCampaign(supabase, userId, params);
        break;
      case "send":
        result = await sendCampaign(supabase, userId, params);
        break;
      case "list":
        result = await listCampaigns(supabase, userId, params);
        break;
      case "get":
        result = await getCampaign(supabase, userId, params);
        break;
      case "delete":
        result = await deleteCampaign(supabase, userId, params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Broadcast sender error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function createCampaign(supabase: any, userId: string, params: any) {
  const {
    whatsapp_number_id,
    name,
    template_name,
    template_language,
    template_params,
    filter_categories,
    filter_tags,
    contact_ids,
  } = params;

  let filteredContacts: any[] = [];

  if (contact_ids && contact_ids.length > 0) {
    // Manual selection: fetch only selected contacts
    // Process in batches of 50 to avoid query limits
    for (let i = 0; i < contact_ids.length; i += 50) {
      const batch = contact_ids.slice(i, i + 50);
      const { data, error } = await supabase
        .from("contacts")
        .select("id, phone, name")
        .in("id", batch);
      if (error) throw error;
      filteredContacts.push(...(data || []));
    }
  } else {
    // Fallback: filter-based selection
    const { data: allContacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, phone, name, category, tags")
      .eq("whatsapp_number_id", whatsapp_number_id);
    if (contactsError) throw contactsError;

    filteredContacts = allContacts || [];
    if (filter_categories && filter_categories.length > 0) {
      filteredContacts = filteredContacts.filter(
        (c: any) => c.category && filter_categories.includes(c.category)
      );
    }
    if (filter_tags && filter_tags.length > 0) {
      filteredContacts = filteredContacts.filter((c: any) =>
        c.tags && c.tags.some((t: string) => filter_tags.includes(t))
      );
    }
  }

  if (filteredContacts.length === 0) {
    throw new Error("No contacts selected");
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("broadcast_campaigns")
    .insert({
      user_id: userId,
      whatsapp_number_id,
      name,
      template_name,
      template_language: template_language || "en",
      template_params: template_params || {},
      filter_categories: filter_categories || [],
      filter_tags: filter_tags || [],
      total_recipients: filteredContacts.length,
      status: "draft",
    })
    .select()
    .single();

  if (campaignError) throw campaignError;

  // Create recipients
  const recipients = filteredContacts.map((c: any) => ({
    campaign_id: campaign.id,
    contact_id: c.id,
    phone: c.phone,
    contact_name: c.name || null,
    status: "pending",
  }));

  // Insert in batches of 100
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100);
    const { error: recipientError } = await supabase
      .from("broadcast_recipients")
      .insert(batch);
    if (recipientError) throw recipientError;
  }

  return { campaign, recipients_count: filteredContacts.length };
}

async function sendCampaign(supabase: any, userId: string, params: any) {
  const { campaign_id } = params;

  // Get campaign
  const { data: campaign, error: campError } = await supabase
    .from("broadcast_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("user_id", userId)
    .single();

  if (campError || !campaign) throw new Error("Campaign not found");

  if (campaign.status === "sending" || campaign.status === "completed") {
    throw new Error("Campaign already sent or in progress");
  }

  // Get WhatsApp number access token
  const { data: waNumber, error: waError } = await supabase
    .from("whatsapp_numbers")
    .select("access_token, phone_number_id")
    .eq("id", campaign.whatsapp_number_id)
    .single();

  if (waError || !waNumber?.access_token) {
    throw new Error("WhatsApp number not found or no access token");
  }

  // Update campaign status to sending
  await supabase
    .from("broadcast_campaigns")
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", campaign_id);

  // Get pending recipients
  const { data: recipients, error: recError } = await supabase
    .from("broadcast_recipients")
    .select("*")
    .eq("campaign_id", campaign_id)
    .eq("status", "pending");

  if (recError) throw recError;

  let sentCount = 0;
  let failedCount = 0;

  // Send messages with rate limiting (50ms between messages)
  for (const recipient of recipients || []) {
    try {
      // Build template message payload
      const messageBody: any = {
        messaging_product: "whatsapp",
        to: recipient.phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: campaign.template_name,
          language: { code: campaign.template_language },
        },
      };

      // Add template components if params exist
      if (campaign.template_params && Object.keys(campaign.template_params).length > 0) {
        const components: any[] = [];
        if (campaign.template_params.body && campaign.template_params.body.length > 0) {
          components.push({
            type: "body",
            parameters: campaign.template_params.body.map((p: string) => ({
              type: "text",
              text: p,
            })),
          });
        }
        if (campaign.template_params.header && campaign.template_params.header.length > 0) {
          components.push({
            type: "header",
            parameters: campaign.template_params.header.map((p: string) => ({
              type: "text",
              text: p,
            })),
          });
        }
        if (components.length > 0) {
          messageBody.template.components = components;
        }
      }

      const response = await fetch(
        `${META_GRAPH_URL}/${waNumber.phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waNumber.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        }
      );

      const result = await response.json();

      if (result.messages && result.messages[0]?.id) {
        await supabase
          .from("broadcast_recipients")
          .update({
            status: "sent",
            wa_message_id: result.messages[0].id,
            sent_at: new Date().toISOString(),
          })
          .eq("id", recipient.id);
        sentCount++;
      } else {
        const errorMsg =
          result.error?.message || JSON.stringify(result.error) || "Unknown error";
        await supabase
          .from("broadcast_recipients")
          .update({
            status: "failed",
            error_message: errorMsg,
          })
          .eq("id", recipient.id);
        failedCount++;
      }

      // Rate limit: 50ms delay between messages
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err: any) {
      await supabase
        .from("broadcast_recipients")
        .update({
          status: "failed",
          error_message: err.message || "Send error",
        })
        .eq("id", recipient.id);
      failedCount++;
    }
  }

  // Update campaign status
  await supabase
    .from("broadcast_campaigns")
    .update({
      status: "completed",
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign_id);

  return { sent: sentCount, failed: failedCount, total: (recipients || []).length };
}

async function listCampaigns(supabase: any, userId: string, params: any) {
  const query = supabase
    .from("broadcast_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.whatsapp_number_id) {
    query.eq("whatsapp_number_id", params.whatsapp_number_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { campaigns: data };
}

async function getCampaign(supabase: any, userId: string, params: any) {
  const { campaign_id } = params;

  const { data: campaign, error: campError } = await supabase
    .from("broadcast_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campError) throw campError;

  const { data: recipients, error: recError } = await supabase
    .from("broadcast_recipients")
    .select("*")
    .eq("campaign_id", campaign_id)
    .order("created_at", { ascending: true });

  if (recError) throw recError;

  return { campaign, recipients };
}

async function deleteCampaign(supabase: any, userId: string, params: any) {
  const { campaign_id } = params;

  const { error } = await supabase
    .from("broadcast_campaigns")
    .delete()
    .eq("id", campaign_id)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}
