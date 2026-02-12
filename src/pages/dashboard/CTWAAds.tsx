import { useState, useEffect, useCallback } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  ExternalLink,
  Copy,
  CheckCircle2,
  BarChart3,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface CTWACampaign {
  id: string;
  name: string;
  status: string;
  leads: number;
  cost_per_lead: number;
  clicks: number;
  impressions: number;
  spend: number;
  platform: string;
  daily_budget: number | null;
  ad_text: string | null;
  pre_filled_message: string | null;
  deep_link: string | null;
  meta_campaign_id: string | null;
  created_at: string;
}

interface Stats {
  total_leads: number;
  total_clicks: number;
  total_spend: number;
  avg_cost_per_lead: string;
  active_campaigns: number;
  conversion_rate: string;
}

async function callCTWA(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ctwa-ads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function CTWAAds() {
  const { selectedNumber } = useWhatsApp();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CTWACampaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formBudget, setFormBudget] = useState('500');
  const [formAdText, setFormAdText] = useState('');
  const [formPreMessage, setFormPreMessage] = useState("Hi, I'm interested!");
  const [formPlatform, setFormPlatform] = useState('both');

  const deepLink = selectedNumber
    ? `https://wa.me/${selectedNumber.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(formPreMessage)}`
    : '';

  const loadData = useCallback(async () => {
    if (!user || !selectedNumber) return;
    setLoading(true);
    try {
      const [campaignRes, statsRes] = await Promise.all([
        callCTWA('list', { whatsapp_number_id: selectedNumber.id }),
        callCTWA('get-stats', { whatsapp_number_id: selectedNumber.id }),
      ]);
      setCampaigns(campaignRes.campaigns || []);
      setStats(statsRes);
    } catch (err: any) {
      console.error('Failed to load CTWA data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!selectedNumber || !formName.trim()) return;
    setCreating(true);
    try {
      await callCTWA('create', {
        whatsapp_number_id: selectedNumber.id,
        name: formName,
        daily_budget: parseFloat(formBudget),
        ad_text: formAdText,
        pre_filled_message: formPreMessage,
        platform: formPlatform,
      });
      toast({ title: 'Campaign created!', description: 'Campaign is paused. Activate it when ready.' });
      setDialogOpen(false);
      setFormName('');
      setFormBudget('500');
      setFormAdText('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusToggle = async (campaign: CTWACampaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await callCTWA('update-status', { campaign_id: campaign.id, new_status: newStatus });
      toast({ title: `Campaign ${newStatus}` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Delete this campaign? This will also remove it from Meta Ads.')) return;
    try {
      await callCTWA('delete', { campaign_id: campaignId });
      toast({ title: 'Campaign deleted' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    if (!selectedNumber) return;
    setSyncing(true);
    try {
      const result = await callCTWA('sync-insights', { whatsapp_number_id: selectedNumber.id });
      toast({ title: 'Insights synced', description: `Updated ${result.synced} campaigns` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-status-active/10 text-status-active';
      case 'paused': return 'bg-status-pending/10 text-status-pending';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!selectedNumber) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <MousePointerClick className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Connect a WhatsApp Number</h3>
            <p className="text-muted-foreground text-sm">
              You need to connect a WhatsApp number first to create CTWA campaigns.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <MousePointerClick className="h-6 w-6 text-primary" />
            Click To WhatsApp Ads
          </h1>
          <p className="text-muted-foreground mt-1">
            Create & manage real Meta Ads campaigns that drive leads to WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Insights
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create CTWA Campaign</DialogTitle>
                <DialogDescription>
                  This will create a real campaign in your Meta Ads Manager (starts paused).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Summer Sale CTWA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Budget (₹)</Label>
                  <Input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ad Text</Label>
                  <Textarea
                    value={formAdText}
                    onChange={(e) => setFormAdText(e.target.value)}
                    placeholder="Your ad copy here..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pre-filled WhatsApp Message</Label>
                  <Input
                    value={formPreMessage}
                    onChange={(e) => setFormPreMessage(e.target.value)}
                    placeholder="Hi, I'm interested!"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !formName.trim()}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Total Leads', value: stats?.total_leads ?? '—', color: 'text-primary' },
          { icon: TrendingDown, label: 'Avg Cost/Lead', value: stats ? `₹${stats.avg_cost_per_lead}` : '—', color: 'text-status-active' },
          { icon: Target, label: 'Conversion Rate', value: stats ? `${stats.conversion_rate}%` : '—', color: 'text-primary' },
          { icon: BarChart3, label: 'Active Campaigns', value: stats?.active_campaigns ?? '—', color: 'text-muted-foreground' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <span className="text-xl font-bold text-foreground">{stat.value}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="setup">Quick Setup</TabsTrigger>
          <TabsTrigger value="guide">How It Works</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MousePointerClick className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first Click-to-WhatsApp campaign to start driving leads.
                </p>
                <Button variant="hero" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MousePointerClick className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={statusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">{campaign.platform}</span>
                          {campaign.daily_budget && (
                            <span className="text-xs text-muted-foreground">₹{campaign.daily_budget}/day</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Leads</p>
                        <p className="font-bold text-foreground">{campaign.leads}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Cost/Lead</p>
                        <p className="font-bold text-foreground">₹{campaign.cost_per_lead?.toFixed(2) || '0'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Clicks</p>
                        <p className="font-bold text-foreground">{campaign.clicks}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStatusToggle(campaign)}
                          title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {campaign.status === 'active' ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(campaign.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {campaign.meta_campaign_id && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id}`, '_blank')}
                            title="View in Meta Ads Manager"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick CTWA Link Generator
              </CardTitle>
              <CardDescription>
                Generate a Click-to-WhatsApp deep link to use in your ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pre-filled Message</Label>
                <Textarea
                  value={formPreMessage}
                  onChange={(e) => setFormPreMessage(e.target.value)}
                  placeholder="Hi, I'm interested in your offer!"
                  className="resize-none"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Your WhatsApp Deep Link</Label>
                <div className="flex gap-2">
                  <Input value={deepLink} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={handleCopy} disabled={!deepLink}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-status-active" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL as the destination in your Meta Ads Manager CTA button
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How Click-to-WhatsApp Ads Work</CardTitle>
              <CardDescription>Follow these steps to set up your first CTWA campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { step: 1, title: 'Create a Campaign', description: 'Click "Create Campaign" above. This creates a real campaign in your Meta Ads account (starts paused).' },
                  { step: 2, title: 'Configure in Meta Ads Manager', description: 'Open the campaign in Meta Ads Manager to set up your ad creative, targeting audience, and placements.' },
                  { step: 3, title: 'Activate the Campaign', description: 'Once your ad is set up, activate the campaign from here or directly in Meta Ads Manager.' },
                  { step: 4, title: 'Track & Convert', description: 'Click "Sync Insights" to pull real performance data. Chat Setu auto-captures leads when users message you.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
