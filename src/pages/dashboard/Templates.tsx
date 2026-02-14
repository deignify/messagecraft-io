import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Pause,
  Filter,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Template } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';
import { TemplateForm } from '@/components/templates/TemplateForm';
import type { CreateTemplateInput } from '@/lib/template-types';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 12;

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  APPROVED: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'bg-status-active/10 text-status-active border-status-active/30',
    label: 'Approved',
  },
  PENDING: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-status-pending/10 text-status-pending border-status-pending/30',
    label: 'Pending',
  },
  REJECTED: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'bg-status-error/10 text-status-error border-status-error/30',
    label: 'Rejected',
  },
  DISABLED: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'bg-status-error/10 text-status-error border-status-error/30',
    label: 'Disabled',
  },
  PAUSED: {
    icon: <Pause className="h-3.5 w-3.5" />,
    color: 'bg-muted text-muted-foreground border-border',
    label: 'Paused',
  },
  LIMIT_EXCEEDED: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'bg-status-pending/10 text-status-pending border-status-pending/30',
    label: 'Limit Exceeded',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: 'bg-accent/10 text-accent border-accent/20',
  UTILITY: 'bg-primary/10 text-primary border-primary/20',
  AUTHENTICATION: 'bg-muted text-muted-foreground border-border',
};

type StatusFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED' | 'PAUSED';

export default function Templates() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // For creating templates via Meta
  const { createTemplate, saving } = useMessageTemplates();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [editTarget, setEditTarget] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!selectedNumber || !user) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as Template[]);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedNumber, user, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSyncTemplates = async () => {
    if (!selectedNumber) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-templates', {
        body: { whatsapp_number_id: selectedNumber.id },
      });
      if (error) throw error;
      await fetchTemplates();
      toast({ title: 'Synced successfully', description: 'Templates synced from Meta' });
    } catch (error: any) {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: templates.length };
    templates.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [templates, searchQuery, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  const getBodyText = (template: Template) => {
    if (!template.components || !Array.isArray(template.components)) return '';
    const body = (template.components as any[]).find((c: any) => c.type === 'BODY');
    return body?.text || '';
  };

  const getHeaderText = (template: Template) => {
    if (!template.components || !Array.isArray(template.components)) return null;
    const header = (template.components as any[]).find((c: any) => c.type === 'HEADER');
    return header?.text || null;
  };

  const getFooterText = (template: Template) => {
    if (!template.components || !Array.isArray(template.components)) return null;
    const footer = (template.components as any[]).find((c: any) => c.type === 'FOOTER');
    return footer?.text || null;
  };

  const getButtons = (template: Template) => {
    if (!template.components || !Array.isArray(template.components)) return [];
    const buttons = (template.components as any[]).find((c: any) => c.type === 'BUTTONS');
    return buttons?.buttons || [];
  };

  const handleCreateTemplate = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: CreateTemplateInput) => {
    const result = await createTemplate(data, true);
    if (result) {
      setTimeout(() => handleSyncTemplates(), 2000);
    }
    return result;
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget || !selectedNumber) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-template', {
        body: {
          action: 'delete',
          whatsapp_number_id: selectedNumber.id,
          template_name: deleteTarget.name,
          template_id: deleteTarget.id,
        },
      });
      if (error) throw error;
      toast({ title: 'Template deleted', description: `"${deleteTarget.name}" has been deleted from Meta` });
      setDeleteTarget(null);
      await fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditTemplate = async (template: Template) => {
    if (!selectedNumber) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-template', {
        body: {
          action: 'edit',
          whatsapp_number_id: selectedNumber.id,
          template_name: template.name,
          template_id: template.id,
        },
      });
      if (error) throw error;
      toast({ title: 'Ready to edit', description: 'Old template removed. Create the updated version now.' });
      await fetchTemplates();
      // Open form pre-filled for recreation
      setShowForm(true);
    } catch (error: any) {
      toast({ title: 'Edit failed', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Phone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No WhatsApp number selected</h2>
          <p className="text-muted-foreground max-w-sm">
            Please select or connect a WhatsApp number to manage templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Message Templates</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your WhatsApp message templates synced from Meta
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSyncTemplates} disabled={syncing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync from Meta'}
          </Button>
          <Button variant="hero" onClick={handleCreateTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'DISABLED', 'PAUSED'] as StatusFilter[]).map((status) => {
          const count = statusCounts[status] || 0;
          if (status !== 'ALL' && count === 0) return null;
          const config = status !== 'ALL' ? STATUS_CONFIG[status] : null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
              )}
            >
              {config?.icon}
              {status === 'ALL' ? 'All' : config?.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                statusFilter === status ? 'bg-primary-foreground/20' : 'bg-muted'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="UTILITY">Utility</SelectItem>
            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {templates.length === 0 ? 'No templates yet' : 'No templates match your filters'}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {templates.length === 0
              ? 'Create your first template or sync from Meta to get started.'
              : 'Try adjusting your search or filters to find templates.'}
          </p>
          {templates.length === 0 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleSyncTemplates} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                Sync from Meta
              </Button>
              <Button variant="hero" onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length} templates
            </p>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedTemplates.map((template) => {
              const statusConf = STATUS_CONFIG[template.status];
              const bodyText = getBodyText(template);

              return (
                <div
                  key={template.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200 flex flex-col"
                >
                  {/* Top row: badges + menu */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('gap-1.5 text-xs', statusConf?.color)}>
                        {statusConf?.icon}
                        {statusConf?.label || template.status}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', CATEGORY_COLORS[template.category])}>
                        {template.category}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditTemplate(template)}
                          disabled={deleting}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit (Delete & Recreate)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(template)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete from Meta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Name */}
                  <h3 className="font-semibold text-foreground truncate mb-1" title={template.name}>
                    {template.name}
                  </h3>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="uppercase font-medium">{template.language}</span>
                    {template.last_synced_at && (
                      <>
                        <span>•</span>
                        <span>Synced {new Date(template.last_synced_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>

                  {/* Body preview */}
                  <div className="flex-1 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                    {bodyText || <span className="italic">No body text</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      disabled={template.status !== 'APPROVED'}
                      onClick={() => {
                        toast({
                          title: 'Send Template',
                          description: `Use "${template.name}" in Campaigns to send to contacts.`,
                        });
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Use in Campaign
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-muted-foreground text-sm">…</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                            currentPage === page
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Template Dialog */}
      <TemplateForm
        open={showForm}
        onOpenChange={setShowForm}
        template={null}
        onSubmit={handleFormSubmit}
        saving={saving}
      />

      {/* Meta Template Preview Dialog */}
      <MetaTemplatePreviewDialog
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        template={previewTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template from Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong> from Meta?
              This will permanently remove the template from your WhatsApp Business Account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete from Meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading overlay for edit/delete operations */}
      {deleting && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">Processing with Meta API...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Dedicated preview dialog for Meta-synced templates
function MetaTemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}) {
  if (!template) return null;

  const components = Array.isArray(template.components) ? (template.components as any[]) : [];
  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  const footer = components.find((c) => c.type === 'FOOTER');
  const buttons = components.find((c) => c.type === 'BUTTONS')?.buttons || [];
  const statusConf = STATUS_CONFIG[template.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="truncate">{template.name}</span>
            <Badge variant="outline" className={cn('gap-1', statusConf?.color)}>
              {statusConf?.icon}
              {statusConf?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium mt-0.5">{template.category}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Language</p>
              <p className="text-sm font-medium mt-0.5 uppercase">{template.language}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Buttons</p>
              <p className="text-sm font-medium mt-0.5">{buttons.length}</p>
            </div>
          </div>

          {/* WhatsApp Preview */}
          <div className="max-w-[300px] mx-auto">
            <div className="bg-[#111B21] rounded-[2rem] p-2.5 shadow-2xl">
              <div className="bg-[#0B141A] rounded-[1.5rem] overflow-hidden">
                {/* WA Header */}
                <div className="h-12 bg-[#202C33] flex items-center px-3 gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#2A3942] flex items-center justify-center">
                    <span className="text-[#8696A0] text-xs font-medium">YB</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-medium">Your Business</p>
                    <p className="text-[#8696A0] text-[10px]">Template Preview</p>
                  </div>
                </div>

                {/* Chat area */}
                <div className="p-3 min-h-[280px]" style={{ backgroundColor: '#0B141A' }}>
                  <div className="max-w-[95%] bg-[#202C33] rounded-lg rounded-tl-none shadow-sm overflow-hidden">
                    {/* Header */}
                    {header && (
                      <div className="border-b border-[#374045]">
                        {header.format === 'TEXT' && header.text && (
                          <div className="p-2.5 font-semibold text-white text-xs">{header.text}</div>
                        )}
                        {header.format === 'IMAGE' && (
                          <div className="aspect-video bg-[#374045] flex items-center justify-center">
                            <span className="text-[10px] text-[#8696A0]">📷 Image Header</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-2.5 text-xs text-[#E9EDEF] whitespace-pre-wrap leading-relaxed">
                      {body?.text || 'No body text'}
                    </div>

                    {/* Footer */}
                    {footer?.text && (
                      <div className="px-2.5 pb-2 text-[10px] text-[#8696A0]">{footer.text}</div>
                    )}

                    {/* Timestamp */}
                    <div className="px-2.5 pb-1.5 flex justify-end">
                      <span className="text-[9px] text-[#8696A0]">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Buttons */}
                    {buttons.length > 0 && (
                      <div className="border-t border-[#374045]">
                        {buttons.map((btn: any, i: number) => (
                          <div
                            key={i}
                            className={cn(
                              'p-2 text-center text-xs text-[#00A884] font-medium',
                              i < buttons.length - 1 && 'border-b border-[#374045]'
                            )}
                          >
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Synced info */}
          {template.last_synced_at && (
            <p className="text-xs text-muted-foreground text-center">
              Last synced: {new Date(template.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
