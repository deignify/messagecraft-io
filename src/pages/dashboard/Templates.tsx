import { useState, useEffect } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  RefreshCw,
  Phone,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Search,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Template } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplatePreviewDialog } from '@/components/templates/TemplatePreviewDialog';
import type { MessageTemplate, CreateTemplateInput, UpdateTemplateInput } from '@/lib/template-types';

export default function Templates() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();
  
  // Synced templates from Meta
  const [syncedTemplates, setSyncedTemplates] = useState<Template[]>([]);
  const [loadingSynced, setLoadingSynced] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom templates
  const {
    templates: customTemplates,
    loading: loadingCustom,
    saving,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    submitForReview,
  } = useMessageTemplates();

  // Form and preview state
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!selectedNumber || !user) {
      setSyncedTemplates([]);
      setLoadingSynced(false);
      return;
    }

    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('name', { ascending: true });

      if (!error && data) {
        setSyncedTemplates(data as Template[]);
      }
      setLoadingSynced(false);
    };

    fetchTemplates();
  }, [selectedNumber, user]);

  const handleSyncTemplates = async () => {
    if (!selectedNumber) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-templates', {
        body: { whatsapp_number_id: selectedNumber.id },
      });

      if (error) throw error;

      const { data: newTemplates } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('name', { ascending: true });

      if (newTemplates) {
        setSyncedTemplates(newTemplates as Template[]);
      }

      toast({
        title: 'Templates synced',
        description: 'Successfully synced templates from Meta',
      });
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-status-active" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-status-pending" />;
      case 'REJECTED':
      case 'DISABLED':
        return <XCircle className="h-4 w-4 text-status-error" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      APPROVED: 'bg-status-active/10 text-status-active border-status-active/30',
      PENDING: 'bg-status-pending/10 text-status-pending border-status-pending/30',
      REJECTED: 'bg-status-error/10 text-status-error border-status-error/30',
      DISABLED: 'bg-status-error/10 text-status-error border-status-error/30',
      PAUSED: 'bg-muted text-muted-foreground border-border',
    };

    return (
      <Badge variant="outline" className={cn('gap-1', variants[status] || '')}>
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      MARKETING: 'bg-accent/10 text-accent',
      UTILITY: 'bg-primary/10 text-primary',
      AUTHENTICATION: 'bg-muted text-muted-foreground',
    };

    return (
      <Badge variant="secondary" className={colors[category] || ''}>
        {category}
      </Badge>
    );
  };

  const filteredSyncedTemplates = syncedTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomTemplates = customTemplates.filter((t) =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handlePreviewTemplate = (template: MessageTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleFormSubmit = async (data: CreateTemplateInput, submitForReviewFlag?: boolean) => {
    if (editingTemplate) {
      return await updateTemplate(editingTemplate.id, data as UpdateTemplateInput);
    }
    return await createTemplate(data, submitForReviewFlag);
  };

  const handleSubmitForReview = async (id: string) => {
    await submitForReview(id);
  };

  const handleSendTemplate = (template: MessageTemplate) => {
    toast({
      title: 'Send Template',
      description: `Ready to send "${template.template_name}" - Coming soon!`,
    });
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
            Please select or connect a WhatsApp number to view templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Message Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create custom templates or sync from Meta
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="custom">
            Custom Templates ({customTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="synced">
            Meta Templates ({syncedTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* Custom Templates Tab */}
        <TabsContent value="custom" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button variant="hero" onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          {loadingCustom ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomTemplates.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {customTemplates.length === 0 ? 'No custom templates yet' : 'No matching templates'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {customTemplates.length === 0
                  ? 'Create your first template to get started'
                  : 'Try adjusting your search query'}
              </p>
              {customTemplates.length === 0 && (
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCustomTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditTemplate}
                  onDelete={deleteTemplate}
                  onPreview={handlePreviewTemplate}
                  onSubmitForReview={handleSubmitForReview}
                  onSend={handleSendTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Synced Templates Tab */}
        <TabsContent value="synced" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleSyncTemplates} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? 'Syncing...' : 'Sync from Meta'}
            </Button>
          </div>

          {loadingSynced ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSyncedTemplates.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {syncedTemplates.length === 0 ? 'No templates found' : 'No matching templates'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {syncedTemplates.length === 0
                  ? 'Click "Sync from Meta" to fetch templates'
                  : 'Try adjusting your search query'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSyncedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {template.name}
                        </h3>
                        {getStatusBadge(template.status)}
                        {getCategoryBadge(template.category)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Language: {template.language}</span>
                        {template.last_synced_at && (
                          <span>
                            Last synced: {new Date(template.last_synced_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {template.components && (
                        <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                          {Array.isArray(template.components) 
                            ? (template.components as any[]).find((c: any) => c.type === 'BODY')?.text || 'No body text'
                            : 'No body text'}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={template.status !== 'APPROVED'}
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Form Dialog */}
      <TemplateForm
        open={showForm}
        onOpenChange={setShowForm}
        template={editingTemplate}
        onSubmit={handleFormSubmit}
        saving={saving}
      />

      {/* Template Preview Dialog */}
      <TemplatePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        template={previewTemplate}
      />
    </div>
  );
}
