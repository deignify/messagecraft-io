import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com/v22.0";

const CtwaActionSchema = z.object({
  action: z.enum(["list", "create", "update-status", "delete", "sync-insights", "get-stats"]),
  whatsapp_number_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  new_status: z.enum(["active", "paused"]).optional(),
  name: z.string().max(256).optional(),
  daily_budget: z.number().positive().max(1000000).optional(),
  ad_text: z.string().max(2048).optional(),
  pre_filled_message: z.string().max(256).optional(),
  platform: z.string().max(20).optional(),
  targeting: z.record(z.unknown()).optional(),
  page_id: z.string().max(50).optional(),
}).passthrough();

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

    const rawBody = await req.json();
    const parseResult = CtwaActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parseResult.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { action, ...params } = parseResult.data;
    let adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!adAccountId) {
      throw new Error("META_AD_ACCOUNT_ID not configured");
    }
    // Strip act_ prefix if user included it
    adAccountId = adAccountId.replace(/^act_/, "");

    const adsAccessToken = Deno.env.get("META_ADS_ACCESS_TOKEN");
    if (!adsAccessToken) {
      throw new Error("META_ADS_ACCESS_TOKEN not configured");
    }

    let result;

    switch (action) {
      case "list":
        result = await listCampaigns(supabase, userId, params.whatsapp_number_id);
        break;
      case "create":
        result = await createCampaign(supabase, userId, adAccountId, adsAccessToken, params);
        break;
      case "update-status":
        result = await updateCampaignStatus(supabase, userId, adAccountId, adsAccessToken, params);
        break;
      case "delete":
        result = await deleteCampaign(supabase, userId, adAccountId, adsAccessToken, params);
        break;
      case "sync-insights":
        result = await syncInsights(supabase, userId, adAccountId, adsAccessToken, params);
        break;
      case "get-stats":
        result = await getStats(supabase, userId, params.whatsapp_number_id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CTWA Ads error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getMetaAccessToken(supabase: any, userId: string, whatsappNumberId: string) {
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("access_token, phone_number")
    .eq("id", whatsappNumberId)
    .single();

  if (error || !data?.access_token) {
    throw new Error("WhatsApp number not found or no access token");
  }
  return data;
}

async function listCampaigns(supabase: any, userId: string, whatsappNumberId: string) {
  const query = supabase
    .from("ctwa_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (whatsappNumberId) {
    query.eq("whatsapp_number_id", whatsappNumberId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { campaigns: data };
}

async function createCampaign(
  supabase: any,
  userId: string,
  adAccountId: string,
  adsAccessToken: string,
  params: any
) {
  const { whatsapp_number_id, name, daily_budget, ad_text, pre_filled_message, platform, targeting, page_id } = params;
  
  if (!page_id) {
    throw new Error("Facebook Page ID is required for CTWA campaigns");
  }

  const waData = await getMetaAccessToken(supabase, userId, whatsapp_number_id);
  const phoneNumber = waData.phone_number;

  // 1. Create Campaign in Meta
  const campaignRes = await fetch(
    `${META_GRAPH_URL}/act_${adAccountId}/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        objective: "OUTCOME_ENGAGEMENT",
        status: "PAUSED",
        special_ad_categories: [],
        access_token: adsAccessToken,
      }),
    }
  );
  const campaignData = await campaignRes.json();
  if (campaignData.error) {
    throw new Error(`Meta Campaign Error: ${campaignData.error.message}`);
  }

  // 2. Create Ad Set with proper CTWA config
  const adSetBody: Record<string, any> = {
    name: `${name} - Ad Set`,
    campaign_id: campaignData.id,
    daily_budget: Math.round((daily_budget || 500) * 100), // Convert to paise/cents
    billing_event: "IMPRESSIONS",
    optimization_goal: "CONVERSATIONS",
    destination_type: "WHATSAPP",
    status: "PAUSED",
    targeting: targeting?.geo_locations 
      ? { geo_locations: targeting.geo_locations } 
      : { geo_locations: { countries: ["IN"] } },
    access_token: adsAccessToken,
    promoted_object: {
      page_id: page_id,
    },
  };

  const adSetRes = await fetch(
    `${META_GRAPH_URL}/act_${adAccountId}/adsets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adSetBody),
    }
  );
  const adSetData = await adSetRes.json();
  if (adSetData.error) {
    // Cleanup campaign on failure
    await fetch(`${META_GRAPH_URL}/${campaignData.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: adsAccessToken }),
    });
    throw new Error(`Meta Ad Set Error: ${adSetData.error.message}`);
  }

  // 3. Build deep link
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(pre_filled_message || "Hi, I'm interested!");
  const deepLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  // 4. Save to database
  const { data: campaign, error: dbError } = await supabase
    .from("ctwa_campaigns")
    .insert({
      user_id: userId,
      whatsapp_number_id,
      meta_campaign_id: campaignData.id,
      meta_adset_id: adSetData.id,
      name,
      status: "paused",
      daily_budget,
      platform: platform || "both",
      ad_text,
      pre_filled_message,
      deep_link: deepLink,
      targeting: targeting || {},
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return { campaign, meta_campaign_id: campaignData.id, meta_adset_id: adSetData.id };
}

async function updateCampaignStatus(
  supabase: any,
  userId: string,
  adAccountId: string,
  adsAccessToken: string,
  params: any
) {
  const { campaign_id, new_status } = params;

  // Get campaign from DB
  const { data: campaign, error } = await supabase
    .from("ctwa_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("user_id", userId)
    .single();

  if (error || !campaign) throw new Error("Campaign not found");

  const metaStatus = new_status === "active" ? "ACTIVE" : "PAUSED";

  // Update campaign status on Meta
  if (campaign.meta_campaign_id) {
    const res = await fetch(`${META_GRAPH_URL}/${campaign.meta_campaign_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: metaStatus, access_token: adsAccessToken }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`Meta Error: ${data.error.message}`);
    }
  }

  // Update in DB
  const { data: updated, error: dbError } = await supabase
    .from("ctwa_campaigns")
    .update({ status: new_status })
    .eq("id", campaign_id)
    .select()
    .single();

  if (dbError) throw dbError;
  return { campaign: updated };
}

async function deleteCampaign(
  supabase: any,
  userId: string,
  adAccountId: string,
  adsAccessToken: string,
  params: any
) {
  const { campaign_id } = params;

  const { data: campaign, error } = await supabase
    .from("ctwa_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("user_id", userId)
    .single();

  if (error || !campaign) throw new Error("Campaign not found");

  // Delete from Meta if exists
  if (campaign.meta_campaign_id) {
    try {
      await fetch(`${META_GRAPH_URL}/${campaign.meta_campaign_id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: adsAccessToken }),
      });
    } catch (e) {
      console.error("Failed to delete Meta campaign:", e);
    }
  }

  // Delete from DB
  const { error: dbError } = await supabase
    .from("ctwa_campaigns")
    .delete()
    .eq("id", campaign_id);

  if (dbError) throw dbError;
  return { success: true };
}

async function syncInsights(
  supabase: any,
  userId: string,
  adAccountId: string,
  adsAccessToken: string,
  params: any
) {
  const { whatsapp_number_id } = params;

  // Get all campaigns with Meta IDs
  const { data: campaigns, error } = await supabase
    .from("ctwa_campaigns")
    .select("id, meta_campaign_id")
    .eq("user_id", userId)
    .eq("whatsapp_number_id", whatsapp_number_id)
    .not("meta_campaign_id", "is", null);

  if (error) throw error;

  const updates = [];

  for (const campaign of campaigns || []) {
    try {
      const insightsRes = await fetch(
        `${META_GRAPH_URL}/${campaign.meta_campaign_id}/insights?fields=clicks,impressions,spend,actions&access_token=${adsAccessToken}`
      );
      const insightsData = await insightsRes.json();

      if (insightsData.data && insightsData.data.length > 0) {
        const insight = insightsData.data[0];
        const leads = insight.actions?.find(
          (a: any) => a.action_type === "onsite_conversion.messaging_conversation_started_7d"
        )?.value || 0;

        const updateData = {
          clicks: parseInt(insight.clicks || "0"),
          impressions: parseInt(insight.impressions || "0"),
          spend: parseFloat(insight.spend || "0"),
          leads: parseInt(leads),
          cost_per_lead: parseInt(leads) > 0
            ? parseFloat(insight.spend || "0") / parseInt(leads)
            : 0,
        };

        await supabase
          .from("ctwa_campaigns")
          .update(updateData)
          .eq("id", campaign.id);

        updates.push({ id: campaign.id, ...updateData });
      }

      // Also sync campaign status
      const campaignRes = await fetch(
        `${META_GRAPH_URL}/${campaign.meta_campaign_id}?fields=status&access_token=${adsAccessToken}`
      );
      const campaignData = await campaignRes.json();
      if (campaignData.status) {
        const dbStatus = campaignData.status === "ACTIVE" ? "active" : 
                         campaignData.status === "PAUSED" ? "paused" : "draft";
        await supabase
          .from("ctwa_campaigns")
          .update({ status: dbStatus })
          .eq("id", campaign.id);
      }
    } catch (e) {
      console.error(`Failed to sync insights for campaign ${campaign.id}:`, e);
    }
  }

  return { synced: updates.length, updates };
}

async function getStats(supabase: any, userId: string, whatsappNumberId: string) {
  const query = supabase
    .from("ctwa_campaigns")
    .select("leads, clicks, spend, cost_per_lead, status")
    .eq("user_id", userId);

  if (whatsappNumberId) {
    query.eq("whatsapp_number_id", whatsappNumberId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const totalLeads = data?.reduce((sum: number, c: any) => sum + (c.leads || 0), 0) || 0;
  const totalClicks = data?.reduce((sum: number, c: any) => sum + (c.clicks || 0), 0) || 0;
  const totalSpend = data?.reduce((sum: number, c: any) => sum + parseFloat(c.spend || 0), 0) || 0;
  const avgCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const activeCampaigns = data?.filter((c: any) => c.status === "active").length || 0;
  const conversionRate = totalClicks > 0 ? ((totalLeads / totalClicks) * 100).toFixed(1) : "0";

  return {
    total_leads: totalLeads,
    total_clicks: totalClicks,
    total_spend: totalSpend,
    avg_cost_per_lead: avgCostPerLead.toFixed(2),
    active_campaigns: activeCampaigns,
    conversion_rate: conversionRate,
  };
}
