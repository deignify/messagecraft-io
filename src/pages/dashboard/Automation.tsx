import { useState, useEffect } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  Plus,
  Phone,
  Loader2,
  MessageSquare,
  Trash2,
  Edit2,
  Power,
  PowerOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Automation, AutomationStep } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

export default function AutomationPage() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();
  
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'first_message' as 'first_message' | 'keyword' | 'always',
    trigger_keywords: [] as string[],
    is_active: true,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedNumber || !user) {
      setAutomations([]);
      setLoading(false);
      return;
    }

    const fetchAutomations = async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('priority', { ascending: false });

      if (!error && data) {
        setAutomations(data as Automation[]);
      }
      setLoading(false);
    };

    fetchAutomations();
  }, [selectedNumber, user]);

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'first_message',
      trigger_keywords: [],
      is_active: true,
    });
    setNewKeyword('');
  };

  const handleCreateAutomation = async () => {
    if (!selectedNumber || !user || !formData.name) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.from('automations').insert({
        user_id: user.id,
        whatsapp_number_id: selectedNumber.id,
        name: formData.name,
        trigger_type: formData.trigger_type,
        trigger_keywords: formData.trigger_keywords,
        is_active: formData.is_active,
      }).select().single();

      if (error) throw error;

      setAutomations([data as Automation, ...automations]);
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Automation created successfully' });
    } catch (error: any) {
      toast({
        title: 'Error creating automation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (automation: Automation) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !automation.is_active })
        .eq('id', automation.id);

      if (error) throw error;

      setAutomations(automations.map((a) =>
        a.id === automation.id ? { ...a, is_active: !a.is_active } : a
      ));
      
      toast({
        title: automation.is_active ? 'Automation disabled' : 'Automation enabled',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating automation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations(automations.filter((a) => a.id !== id));
      toast({ title: 'Automation deleted' });
    } catch (error: any) {
      toast({
        title: 'Error deleting automation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addKeyword = () => {
    if (newKeyword && !formData.trigger_keywords.includes(newKeyword)) {
      setFormData({
        ...formData,
        trigger_keywords: [...formData.trigger_keywords, newKeyword.toLowerCase()],
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      trigger_keywords: formData.trigger_keywords.filter((k) => k !== keyword),
    });
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'first_message':
        return 'First Message';
      case 'keyword':
        return 'Keyword Match';
      case 'always':
        return 'All Messages';
      default:
        return trigger;
    }
  };

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No WhatsApp number selected
          </h2>
          <p className="text-muted-foreground">
            Please select or connect a WhatsApp number to manage automations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Automations
          </h1>
          <p className="text-muted-foreground mt-1">
            Create automated responses and workflows for your WhatsApp messages
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => resetForm()}>
              <Plus className="h-4 w-4" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
              <DialogDescription>
                Set up an automated response workflow for incoming messages.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Automation Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Message"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger Type</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(v: any) => setFormData({ ...formData, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_message">First Message (New Conversation)</SelectItem>
                    <SelectItem value="keyword">Keyword Match</SelectItem>
                    <SelectItem value="always">All Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger_type === 'keyword' && (
                <div className="space-y-2">
                  <Label>Trigger Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button type="button" variant="outline" onClick={addKeyword}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.trigger_keywords.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {formData.trigger_keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeKeyword(keyword)}>
                          {keyword}
                          <span className="text-muted-foreground">×</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable this automation immediately
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleCreateAutomation} disabled={saving || !formData.name}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Automation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hotel Automation Template */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Hotel Concierge Template
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Pre-built automation for hotels with menu-based options: Room info, location, bookings, and more.
            </p>
            <Button variant="brand-outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </div>

      {/* Automations List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No automations yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Create your first automation to respond to messages automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className={cn(
                "bg-card rounded-xl border p-5 transition-all",
                automation.is_active ? "border-primary/30" : "border-border opacity-70"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    automation.is_active ? "bg-primary/10" : "bg-muted"
                  )}>
                    {automation.is_active ? (
                      <Power className="h-5 w-5 text-primary" />
                    ) : (
                      <PowerOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {automation.name}
                      </h3>
                      <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                        {automation.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>Trigger: {getTriggerLabel(automation.trigger_type)}</span>
                      {automation.trigger_keywords.length > 0 && (
                        <span>Keywords: {automation.trigger_keywords.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={() => handleToggleActive(automation)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteAutomation(automation.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
