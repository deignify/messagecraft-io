import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, Pencil, Trash2, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageTemplate } from '@/lib/template-types';
import { useState } from 'react';

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: (template: MessageTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (template: MessageTemplate) => void;
}

export function TemplateCard({ template, onEdit, onDelete, onPreview }: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-status-active" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-status-pending" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-status-error" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      approved: 'bg-status-active/10 text-status-active border-status-active/30',
      pending: 'bg-status-pending/10 text-status-pending border-status-pending/30',
      rejected: 'bg-status-error/10 text-status-error border-status-error/30',
      draft: 'bg-muted text-muted-foreground border-border',
    };

    return (
      <Badge variant="outline" className={cn('gap-1 capitalize', variants[status] || '')}>
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      marketing: 'bg-accent/10 text-accent',
      utility: 'bg-primary/10 text-primary',
      authentication: 'bg-muted text-muted-foreground',
    };

    return (
      <Badge variant="secondary" className={cn('capitalize', colors[category] || '')}>
        {category}
      </Badge>
    );
  };

  const isEditable = template.status === 'draft' || template.status === 'rejected';

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">
                {template.template_name}
              </h3>
              {getStatusBadge(template.status)}
              {getCategoryBadge(template.category)}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>Language: {template.language.toUpperCase()}</span>
              <span>Header: {template.header_type}</span>
              {template.buttons && template.buttons.length > 0 && (
                <span>Buttons: {template.buttons.length}</span>
              )}
            </div>

            {/* Body preview */}
            <div className="p-3 bg-muted rounded-lg text-sm line-clamp-2">
              {template.body_text}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => onPreview(template)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(template)}
                disabled={!isEditable}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Created: {new Date(template.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-muted-foreground">
            Updated: {new Date(template.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.template_name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(template.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
