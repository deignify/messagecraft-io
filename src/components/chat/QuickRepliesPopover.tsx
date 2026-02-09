import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  title: string;
  message: string;
  shortcut: string | null;
  category: string | null;
  usage_count: number;
}

interface QuickRepliesPopoverProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export function QuickRepliesPopover({ onSelect, disabled }: QuickRepliesPopoverProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newShortcut, setNewShortcut] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) fetchReplies();
  }, [open, user]);

  const fetchReplies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('user_id', user!.id)
      .order('usage_count', { ascending: false });

    if (!error && data) setReplies(data as QuickReply[]);
    setLoading(false);
  };

  const handleSelect = async (reply: QuickReply) => {
    onSelect(reply.message);
    setOpen(false);
    // Increment usage count
    await supabase
      .from('quick_replies')
      .update({ usage_count: reply.usage_count + 1 })
      .eq('id', reply.id);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newMessage.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('quick_replies').insert({
      user_id: user.id,
      title: newTitle.trim(),
      message: newMessage.trim(),
      shortcut: newShortcut.trim() || null,
    });
    if (error) {
      toast.error('Failed to save quick reply');
    } else {
      toast.success('Quick reply saved');
      setNewTitle('');
      setNewMessage('');
      setNewShortcut('');
      setShowAdd(false);
      fetchReplies();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('quick_replies').delete().eq('id', id);
    if (!error) setReplies((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = replies.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.message.toLowerCase().includes(search.toLowerCase()) ||
      r.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          disabled={disabled}
          title="Quick Replies"
        >
          <Zap className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="start" sideOffset={8}>
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Quick Replies</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {showAdd ? 'Cancel' : 'Add'}
          </Button>
        </div>

        {showAdd && (
          <div className="p-3 border-b space-y-2">
            <Input
              placeholder="Title (e.g., Greeting)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Textarea
              placeholder="Message content..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
            <Input
              placeholder="Shortcut (e.g., /hello)"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value)}
              className="h-8 text-sm"
            />
            <Button onClick={handleAdd} disabled={saving || !newTitle.trim() || !newMessage.trim()} size="sm" className="w-full">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        )}

        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>

        <ScrollArea className="max-h-52">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {replies.length === 0 ? 'No quick replies yet' : 'No matches found'}
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((reply) => (
                <div
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{reply.title}</span>
                      {reply.shortcut && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {reply.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {reply.message}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(reply.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
