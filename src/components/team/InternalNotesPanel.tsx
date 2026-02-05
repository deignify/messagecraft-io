import { useState } from 'react';
import { InternalNote } from '@/lib/team-types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Loader2,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InternalNotesPanelProps {
  notes: InternalNote[];
  loading: boolean;
  currentUserId?: string;
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export function InternalNotesPanel({
  notes,
  loading,
  currentUserId,
  onAddNote,
  onDeleteNote,
}: InternalNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    
    setSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.[0]?.toUpperCase() || '?';
  };

  return (
    <div className="flex flex-col h-full border-l">
      <div className="p-3 border-b flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Internal Notes</h3>
        <span className="text-xs text-muted-foreground">(Not visible to customer)</span>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <StickyNote className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No internal notes yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "p-3 rounded-lg bg-accent/50 border border-border",
                  "group relative"
                )}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900">
                      {getInitials(note.author?.full_name, note.author?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {note.author?.full_name || note.author?.email || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                  {note.user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t">
        <Textarea
          placeholder="Add an internal note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-20 resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newNote.trim() || submitting}
          className="mt-2 w-full"
          size="sm"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Note
        </Button>
      </div>
    </div>
  );
}
