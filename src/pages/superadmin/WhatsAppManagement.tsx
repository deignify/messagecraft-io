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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreVertical, 
  Wifi, 
  WifiOff,
  Loader2,
  RefreshCw,
  Phone,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WhatsAppNumberWithUser {
  id: string;
  phone_number: string;
  display_name: string | null;
  business_name: string | null;
  status: string;
  waba_id: string;
  phone_number_id: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export default function WhatsAppManagement() {
  const [numbers, setNumbers] = useState<WhatsAppNumberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      // Fetch WhatsApp numbers
      const { data: waNumbers, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (numbersError) throw numbersError;

      // Fetch profiles to get user info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      const profileMap: Record<string, { email: string; full_name: string | null }> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = { email: p.email, full_name: p.full_name };
      });

      const numbersWithUsers: WhatsAppNumberWithUser[] = (waNumbers || []).map(n => ({
        id: n.id,
        phone_number: n.phone_number,
        display_name: n.display_name,
        business_name: n.business_name,
        status: n.status,
        waba_id: n.waba_id,
        phone_number_id: n.phone_number_id,
        created_at: n.created_at,
        user_email: profileMap[n.user_id]?.email || 'Unknown',
        user_name: profileMap[n.user_id]?.full_name,
      }));

      setNumbers(numbersWithUsers);
    } catch (error) {
      console.error('[SuperAdmin] Error fetching numbers:', error);
      toast.error('Failed to load WhatsApp numbers');
    } finally {
      setLoading(false);
    }
  };

  const updateNumberStatus = async (numberId: string, newStatus: string) => {
    setActionLoading(numberId);
    try {
      const updateData: Record<string, any> = { status: newStatus };
      
      // If disconnecting, clear the access token
      if (newStatus === 'disconnected') {
        updateData.access_token = '';
      }

      const { error } = await supabase
        .from('whatsapp_numbers')
        .update(updateData)
        .eq('id', numberId);

      if (error) throw error;

      setNumbers(prev => prev.map(n => 
        n.id === numberId ? { ...n, status: newStatus } : n
      ));

      toast.success(`Number ${newStatus === 'active' ? 'activated' : 'disconnected'} successfully`);
    } catch (error) {
      console.error('[SuperAdmin] Error updating number:', error);
      toast.error('Failed to update number status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredNumbers = numbers.filter(num => 
    num.phone_number.includes(searchQuery) ||
    num.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    num.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    num.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Accounts</h1>
          <p className="text-muted-foreground">Manage all connected WhatsApp numbers</p>
        </div>
        <Button onClick={fetchNumbers} variant="outline" size="sm">
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
                placeholder="Search by phone, business, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredNumbers.length} numbers
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
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNumbers.map((num) => (
                  <TableRow key={num.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{num.phone_number}</div>
                          <div className="text-xs text-muted-foreground">{num.display_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{num.business_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{num.user_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{num.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(num.status)}</TableCell>
                    <TableCell>{format(new Date(num.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={actionLoading === num.id}
                          >
                            {actionLoading === num.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {num.status !== 'active' && (
                            <DropdownMenuItem onClick={() => updateNumberStatus(num.id, 'active')}>
                              <Wifi className="h-4 w-4 mr-2" />
                              Set Active
                            </DropdownMenuItem>
                          )}
                          {num.status !== 'disconnected' && (
                            <DropdownMenuItem 
                              onClick={() => updateNumberStatus(num.id, 'disconnected')}
                              className="text-destructive"
                            >
                              <WifiOff className="h-4 w-4 mr-2" />
                              Disconnect
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNumbers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No WhatsApp numbers found
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
