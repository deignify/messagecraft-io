import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TemplatePreview } from './TemplatePreview';
import type { MessageTemplate } from '@/lib/template-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MessageTemplate | null;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-status-active/10 text-status-active',
      pending: 'bg-status-pending/10 text-status-pending',
      rejected: 'bg-status-error/10 text-status-error',
      draft: 'bg-muted text-muted-foreground',
    };
    return colors[status] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {template.template_name}
            <Badge className={cn('capitalize', getStatusColor(template.status))}>
              {template.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>
              <span className="ml-2 capitalize">{template.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Language:</span>
              <span className="ml-2 uppercase">{template.language}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Header:</span>
              <span className="ml-2 capitalize">{template.header_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Buttons:</span>
              <span className="ml-2">{template.buttons?.length || 0}</span>
            </div>
          </div>

          {/* Variables */}
          {Object.keys(template.variables || {}).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Variables</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(template.variables).map(([key, value]) => (
                  <Badge key={key} variant="outline">
                    {`{{${key}}}`}: {value || 'N/A'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-4 text-center">Preview</h4>
            <TemplatePreview template={template} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
