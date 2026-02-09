import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_LABELS = ['urgent', 'VIP', 'follow-up', 'new-lead', 'resolved', 'spam'];

const LABEL_COLORS: Record<string, string> = {
  urgent: 'bg-destructive/15 text-destructive border-destructive/30',
  VIP: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  'follow-up': 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'new-lead': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  resolved: 'bg-muted text-muted-foreground border-border',
  spam: 'bg-destructive/10 text-destructive/80 border-destructive/20',
};

interface ChatLabelsProps {
  conversationId: string;
  labels: string[];
  onLabelsChange: (labels: string[]) => void;
  compact?: boolean;
}

export function ChatLabels({ conversationId, labels, onLabelsChange, compact }: ChatLabelsProps) {
  const [open, setOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const toggleLabel = async (label: string) => {
    const newLabels = labels.includes(label)
      ? labels.filter((l) => l !== label)
      : [...labels, label];

    const { error } = await supabase
      .from('conversations')
      .update({ labels: newLabels })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to update labels');
    } else {
      onLabelsChange(newLabels);
    }
  };

  const addCustomLabel = async () => {
    const label = customLabel.trim().toLowerCase();
    if (!label || labels.includes(label)) return;

    const newLabels = [...labels, label];
    const { error } = await supabase
      .from('conversations')
      .update({ labels: newLabels })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to add label');
    } else {
      onLabelsChange(newLabels);
      setCustomLabel('');
    }
  };

  const getLabelColor = (label: string) =>
    LABEL_COLORS[label] || 'bg-primary/10 text-primary border-primary/20';

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {labels.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', getLabelColor(label))}
          >
            {label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Labels</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" side="left" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick Labels</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_LABELS.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className={cn(
                      'cursor-pointer text-xs transition-colors',
                      labels.includes(label)
                        ? getLabelColor(label)
                        : 'hover:bg-muted'
                    )}
                    onClick={() => toggleLabel(label)}
                  >
                    {label}
                    {labels.includes(label) && <X className="h-2.5 w-2.5 ml-1" />}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  placeholder="Custom label..."
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && addCustomLabel()}
                />
                <Button size="sm" className="h-7 text-xs px-2" onClick={addCustomLabel} disabled={!customLabel.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className={cn('text-xs cursor-pointer', getLabelColor(label))}
              onClick={() => toggleLabel(label)}
            >
              {label}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
