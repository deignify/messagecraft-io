import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, FileText, Tag, Clock, MessageCircle } from 'lucide-react';
import { ChatLabels } from './ChatLabels';
import type { Conversation, Contact } from '@/lib/supabase-types';
import { format } from 'date-fns';

interface ContactSidebarProps {
  conversation: Conversation;
  onLabelsChange: (labels: string[]) => void;
}

export function ContactSidebar({ conversation, onLabelsChange }: ContactSidebarProps) {
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!conversation.contact_id) return;
    supabase
      .from('contacts')
      .select('*')
      .eq('id', conversation.contact_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContact(data as Contact);
      });
  }, [conversation.contact_id]);

  const labels = (conversation as any).labels || [];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Avatar & Name */}
        <div className="text-center">
          <Avatar className="h-20 w-20 mx-auto mb-3">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {conversation.contact_name?.[0] || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-foreground text-lg">
            {conversation.contact_name || 'Unknown'}
          </h3>
          <p className="text-sm text-muted-foreground">{conversation.contact_phone}</p>
        </div>

        <Separator />

        {/* Labels */}
        <ChatLabels
          conversationId={conversation.id}
          labels={labels}
          onLabelsChange={onLabelsChange}
        />

        <Separator />

        {/* Contact Info */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Contact Info
          </h4>
          <div className="bg-muted rounded-lg p-3 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground">{conversation.contact_phone}</span>
            </div>
            {contact?.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{contact.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground capitalize">{conversation.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground text-xs">
                Created {format(new Date(conversation.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Tags */}
        {contact?.tags && contact.tags.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Contact Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {contact?.notes && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Notes
              </h4>
              <p className="text-sm text-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                {contact.notes}
              </p>
            </div>
          </>
        )}

        {/* Category */}
        {contact?.category && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Category
              </h4>
              <Badge variant="outline">{contact.category}</Badge>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
