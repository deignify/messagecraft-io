import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Loader2,
  RefreshCw,
  MessageSquare,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ConversationWithDetails {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  status: string;
  unread_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  user_email: string;
  whatsapp_number: string;
}

export default function AllConversations() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Fetch conversations
      const { data: convs, error: convsError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (convsError) throw convsError;

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      // Fetch WhatsApp numbers
      const { data: waNumbers, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('id, phone_number');

      if (numbersError) throw numbersError;

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.id] = p.email; });

      const numberMap: Record<string, string> = {};
      waNumbers?.forEach(n => { numberMap[n.id] = n.phone_number; });

      const convsWithDetails: ConversationWithDetails[] = (convs || []).map(c => ({
        id: c.id,
        contact_phone: c.contact_phone,
        contact_name: c.contact_name,
        status: c.status,
        unread_count: c.unread_count,
        last_message_text: c.last_message_text,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        user_email: profileMap[c.user_id] || 'Unknown',
        whatsapp_number: numberMap[c.whatsapp_number_id] || 'Unknown',
      }));

      setConversations(convsWithDetails);
    } catch (error) {
      console.error('[SuperAdmin] Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.contact_phone.includes(searchQuery) ||
    conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.whatsapp_number.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default">Open</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Conversations</h1>
          <p className="text-muted-foreground">View conversations across all users</p>
        </div>
        <Button onClick={fetchConversations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredConversations.length} conversations
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>WhatsApp Number</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Unread</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.map((conv) => (
                  <TableRow key={conv.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{conv.contact_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{conv.contact_phone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{conv.user_email}</TableCell>
                    <TableCell className="text-sm">{conv.whatsapp_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-sm">
                          {conv.last_message_text || 'No messages'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(conv.status)}</TableCell>
                    <TableCell>
                      {conv.unread_count > 0 ? (
                        <Badge variant="destructive">{conv.unread_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {conv.last_message_at 
                        ? format(new Date(conv.last_message_at), 'MMM d, HH:mm')
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
                {filteredConversations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No conversations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
