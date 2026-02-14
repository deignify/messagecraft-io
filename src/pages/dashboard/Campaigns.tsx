import { useState, useEffect } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Send, Trash2, Eye, Users, CheckCircle2, XCircle, Clock, Megaphone, Loader2, RefreshCw } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Campaign {
  id: string;
  name: string;
  template_name: string;
  template_language: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  filter_categories: string[];
  filter_tags: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  components: any;
}

interface Recipient {
  id: string;
  phone: string;
  contact_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export default function Campaigns() {
  const { selectedNumber } = useWhatsApp();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ campaign: Campaign; recipients: Recipient[] } | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Derived data
  const allCategories = [...new Set(contacts.map(c => c.category).filter(Boolean))];
  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];
  const filteredContactCount = contacts.filter(c => {
    if (selectedCategories.length > 0 && (!c.category || !selectedCategories.includes(c.category))) return false;
    if (selectedTags.length > 0 && (!c.tags || !c.tags.some((t: string) => selectedTags.includes(t)))) return false;
    return true;
  }).length;

  useEffect(() => {
    if (selectedNumber) {
      fetchCampaigns();
      fetchTemplates();
      fetchContacts();
    }
  }, [selectedNumber]);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'list', whatsapp_number_id: selectedNumber?.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    if (!selectedNumber) return;
    const { data } = await supabase
      .from('templates')
      .select('id, name, language, status, components')
      .eq('whatsapp_number_id', selectedNumber.id)
      .eq('status', 'APPROVED');
    setTemplates(data || []);
  }

  async function fetchContacts() {
    if (!selectedNumber) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, phone, name, category, tags')
      .eq('whatsapp_number_id', selectedNumber.id);
    setContacts(data || []);
  }

  async function handleCreate() {
    if (!name || !selectedTemplate || !selectedNumber) {
      toast({ title: 'Error', description: 'Please fill campaign name and select a template', variant: 'destructive' });
      return;
    }
    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) return;

    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create',
          whatsapp_number_id: selectedNumber.id,
          name,
          template_name: template.name,
          template_language: template.language,
          filter_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          filter_tags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: 'Campaign Created', description: `${data.recipients_count} recipients added` });
      setShowCreate(false);
      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(campaignId: string) {
    setSending(campaignId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'send', campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: 'Campaign Sent!', description: `Sent: ${data.sent}, Failed: ${data.failed}` });
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(campaignId: string) {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'delete', campaign_id: campaignId }),
      });
      toast({ title: 'Deleted' });
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleViewDetail(campaignId: string) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'get', campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetailData(data);
      setShowDetail(campaignId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  function resetForm() {
    setName('');
    setSelectedTemplate('');
    setSelectedCategories([]);
    setSelectedTags([]);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sending': return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending</Badge>;
      case 'completed': return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (!selectedNumber) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please select a WhatsApp number first</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Broadcast Campaigns
          </h1>
          <p className="text-muted-foreground text-sm">Send bulk template messages to your contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCampaigns}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Broadcast Campaign</DialogTitle>
                <DialogDescription>Select a template and filter contacts to create a campaign</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Campaign Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali Sale 2026" />
                </div>

                <div>
                  <Label>Template (Approved Only)</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name} ({t.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No approved templates. Sync templates first.</p>
                  )}
                </div>

                {/* Category Filter */}
                {allCategories.length > 0 && (
                  <div>
                    <Label>Filter by Category (optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allCategories.map(cat => (
                        <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={(checked) => {
                              setSelectedCategories(prev =>
                                checked ? [...prev, cat] : prev.filter(c => c !== cat)
                              );
                            }}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div>
                    <Label>Filter by Tags (optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allTags.map(tag => (
                        <label key={tag} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedTags.includes(tag)}
                            onCheckedChange={(checked) => {
                              setSelectedTags(prev =>
                                checked ? [...prev, tag] : prev.filter(t => t !== tag)
                              );
                            }}
                          />
                          {tag}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedCategories.length === 0 && selectedTags.length === 0
                      ? `All ${contacts.length} contacts will receive this message`
                      : `${filteredContactCount} contacts match your filters`}
                  </p>
                </div>

                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Campaign ({filteredContactCount || contacts.length} recipients)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'completed').length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Messages Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {campaigns.reduce((s, c) => s + (c.failed_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm">Create your first broadcast campaign to send bulk messages</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Template: <span className="font-mono">{campaign.template_name}</span> • {campaign.total_recipients} recipients
                    </p>
                    {(campaign.filter_categories?.length > 0 || campaign.filter_tags?.length > 0) && (
                      <div className="flex gap-1 flex-wrap">
                        {campaign.filter_categories?.map(c => (
                          <Badge key={c} variant="outline" className="text-[10px]">📁 {c}</Badge>
                        ))}
                        {campaign.filter_tags?.map(t => (
                          <Badge key={t} variant="outline" className="text-[10px]">🏷️ {t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>✅ Sent: {campaign.sent_count || 0}</span>
                      <span>❌ Failed: {campaign.failed_count || 0}</span>
                      <span>📅 {new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(campaign.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSend(campaign.id)}
                        disabled={sending === campaign.id}
                      >
                        {sending === campaign.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Send className="h-4 w-4 mr-1" />Send</>
                        )}
                      </Button>
                    )}
                    {(campaign.status === 'draft' || campaign.status === 'completed') && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(campaign.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => { setShowDetail(null); setDetailData(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailData?.campaign.name}</DialogTitle>
            <DialogDescription>
              Template: {detailData?.campaign.template_name} • {detailData?.recipients?.length || 0} recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {detailData?.recipients?.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                <div>
                  <span className="font-medium">{r.contact_name || r.phone}</span>
                  <span className="text-muted-foreground ml-2">{r.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'sent' && <Badge className="bg-green-600 text-[10px]">Sent</Badge>}
                  {r.status === 'pending' && <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                  {r.status === 'failed' && (
                    <Badge variant="destructive" className="text-[10px]" title={r.error_message || ''}>
                      Failed
                    </Badge>
                  )}
                  {r.status === 'delivered' && <Badge className="bg-blue-600 text-[10px]">Delivered</Badge>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
