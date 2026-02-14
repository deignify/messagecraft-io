import { useState, useEffect, useMemo } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Plus, Send, Trash2, Eye, Users, CheckCircle2, XCircle, Clock, Megaphone, Loader2, RefreshCw, Search } from 'lucide-react';

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

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  category: string | null;
  tags: string[] | null;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ campaign: Campaign; recipients: Recipient[] } | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [templateVariableValues, setTemplateVariableValues] = useState<Record<string, string>>({});

  // Extract variables from selected template components
  const selectedTemplateData = useMemo(() => {
    const t = templates.find(t => t.name === selectedTemplate);
    if (!t || !t.components) return { template: t, variables: [] as string[] };
    
    const components = Array.isArray(t.components) ? t.components : [];
    const bodyComponent = components.find((c: any) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';
    
    // Extract {{1}}, {{2}}, etc.
    const varRegex = /\{\{(\d+)\}\}/g;
    const vars: string[] = [];
    let match;
    while ((match = varRegex.exec(bodyText)) !== null) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    vars.sort((a, b) => parseInt(a) - parseInt(b));
    
    return { template: t, variables: vars, bodyText };
  }, [templates, selectedTemplate]);

  // Derived data
  const allCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    contacts.forEach(c => {
      const cat = c.category || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (filterCategory && filterCategory !== 'all') {
      result = result.filter(c =>
        filterCategory === 'Uncategorized' ? !c.category : c.category === filterCategory
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    }
    return result;
  }, [contacts, filterCategory, searchQuery]);

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
    setContacts((data as Contact[]) || []);
  }

  function toggleContact(contactId: string) {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.add(c.id));
      return next;
    });
  }

  function deselectAllVisible() {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.delete(c.id));
      return next;
    });
  }

  function selectByCategory(category: string) {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      contacts.forEach(c => {
        if (category === 'Uncategorized' ? !c.category : c.category === category) {
          next.add(c.id);
        }
      });
      return next;
    });
  }

  async function handleCreate() {
    if (!name || !selectedTemplate || !selectedNumber) {
      toast({ title: 'Error', description: 'Please fill campaign name and select a template', variant: 'destructive' });
      return;
    }
    if (selectedContactIds.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one contact', variant: 'destructive' });
      return;
    }
    // Validate template variables are filled
    if (selectedTemplateData.variables.length > 0) {
      const emptyVars = selectedTemplateData.variables.filter(v => !templateVariableValues[v]?.trim());
      if (emptyVars.length > 0) {
        toast({ title: 'Error', description: `Please fill all template variables: ${emptyVars.map(v => `{{${v}}}`).join(', ')}`, variant: 'destructive' });
        return;
      }
    }
    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) return;

    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      
      // Build template_params from variable values
      const templateParams: Record<string, string[]> = {};
      if (selectedTemplateData.variables.length > 0) {
        templateParams.body = selectedTemplateData.variables.map(v => templateVariableValues[v] || '');
      }
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-sender`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create',
          whatsapp_number_id: selectedNumber.id,
          name,
          template_name: template.name,
          template_language: template.language,
          template_params: templateParams,
          contact_ids: Array.from(selectedContactIds),
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
    setSelectedContactIds(new Set());
    setSearchQuery('');
    setFilterCategory('all');
    setTemplateVariableValues({});
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sending': return <Badge variant="default"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending</Badge>;
      case 'completed': return <Badge variant="default" className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
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

  const allVisibleSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.id));

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
          <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create Broadcast Campaign</DialogTitle>
                <DialogDescription>Select a template, pick contacts, and send</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2 overflow-y-auto flex-1 pr-1">
                {/* Campaign Name */}
                <div>
                  <Label>Campaign Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali Sale 2026" />
                </div>

                {/* Template */}
                <div>
                  <Label>Template (Approved Only)</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setTemplateVariableValues({}); }}>
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

                {/* Template Variables */}
                {selectedTemplateData.variables.length > 0 && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <div>
                      <Label className="text-sm font-medium">Template Variables</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Fill in the values for each variable. These will be the same for all recipients.
                      </p>
                    </div>
                    {selectedTemplateData.bodyText && (
                      <div className="text-xs bg-background p-2 rounded border border-border/50 text-muted-foreground italic">
                        "{selectedTemplateData.bodyText}"
                      </div>
                    )}
                    <div className="grid gap-2">
                      {selectedTemplateData.variables.map((varKey) => (
                        <div key={varKey} className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0 font-mono text-xs">{`{{${varKey}}}`}</Badge>
                          <Input
                            value={templateVariableValues[varKey] || ''}
                            onChange={e => setTemplateVariableValues(prev => ({ ...prev, [varKey]: e.target.value }))}
                            placeholder={`Value for {{${varKey}}}  (e.g. customer name, order ID...)`}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Quick Select by Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(allCategories).map(([cat, count]) => (
                      <Button
                        key={cat}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => selectByCategory(cat)}
                      >
                        📁 {cat} <Badge variant="secondary" className="ml-1 text-[10px] px-1">{count}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Contact Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Contacts ({selectedContactIds.size} selected)</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllVisible}>
                        Select All ({filteredContacts.length})
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAllVisible}>
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name or phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(allCategories).map(([cat, count]) => (
                          <SelectItem key={cat} value={cat}>{cat} ({count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact List */}
                  <ScrollArea className="h-[240px] border rounded-md">
                    <div className="p-1">
                      {/* Header checkbox */}
                      <label className="flex items-center gap-2 p-2 border-b bg-muted/50 rounded-t-md cursor-pointer sticky top-0 z-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(checked) => checked ? selectAllVisible() : deselectAllVisible()}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {allVisibleSelected ? 'Deselect' : 'Select'} all {filteredContacts.length} shown
                        </span>
                      </label>
                      {filteredContacts.map(contact => (
                        <label
                          key={contact.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0"
                        >
                          <Checkbox
                            checked={selectedContactIds.has(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name || contact.phone}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                          {contact.category && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{contact.category}</Badge>
                          )}
                        </label>
                      ))}
                      {filteredContacts.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">No contacts found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Summary */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedContactIds.size} contacts selected for this campaign
                  </p>
                </div>

                <Button onClick={handleCreate} disabled={creating || selectedContactIds.size === 0} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Campaign ({selectedContactIds.size} recipients)
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
            <p className="text-2xl font-bold text-primary">
              {campaigns.filter(c => c.status === 'completed').length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Messages Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
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
                  {r.status === 'sent' && <Badge variant="default" className="text-[10px]">Sent</Badge>}
                  {r.status === 'pending' && <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                  {r.status === 'failed' && (
                    <Badge variant="destructive" className="text-[10px]" title={r.error_message || ''}>
                      Failed
                    </Badge>
                  )}
                  {r.status === 'delivered' && <Badge variant="default" className="text-[10px]">Delivered</Badge>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}