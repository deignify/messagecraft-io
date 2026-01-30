import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
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
import { 
  Search, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  Ban, 
  Loader2,
  RefreshCw,
  Download,
  CheckSquare,
  XSquare,
  Users,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserWithDetails {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  status: string | null;
  created_at: string;
  whatsapp_count: number;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'blocked';

export default function UsersManagement() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    status?: string;
  }>({ open: false, action: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: numberCounts, error: countsError } = await supabase
        .from('whatsapp_numbers')
        .select('user_id');

      if (countsError) throw countsError;

      const countMap: Record<string, number> = {};
      numberCounts?.forEach(n => {
        countMap[n.user_id] = (countMap[n.user_id] || 0) + 1;
      });

      const usersWithDetails: UserWithDetails[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        company_name: p.company_name,
        status: p.status || 'active',
        created_at: p.created_at,
        whatsapp_count: countMap[p.id] || 0,
      }));

      setUsers(usersWithDetails);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('[SuperAdmin] Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));

      toast.success(`User ${newStatus === 'blocked' ? 'blocked' : newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('[SuperAdmin] Error updating user:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (newStatus: string) => {
    if (selectedUsers.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .in('id', userIds);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        selectedUsers.has(u.id) ? { ...u, status: newStatus } : u
      ));

      toast.success(`${userIds.length} users ${newStatus === 'blocked' ? 'blocked' : newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('[SuperAdmin] Error in bulk action:', error);
      toast.error('Failed to update users');
    } finally {
      setBulkActionLoading(false);
      setConfirmDialog({ open: false, action: '' });
    }
  };

  const handleExportUsers = () => {
    const dataToExport = filteredUsers.map(user => ({
      Name: user.full_name || '',
      Email: user.email,
      Company: user.company_name || '',
      Status: user.status,
      'WhatsApp Numbers': user.whatsapp_count,
      'Joined Date': format(new Date(user.created_at), 'yyyy-MM-dd'),
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(','),
      ...dataToExport.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Users exported successfully');
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      user.status === statusFilter ||
      (statusFilter === 'active' && !user.status);

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Active</Badge>;
    }
  };

  const statusCounts = {
    all: users.length,
    active: users.filter(u => !u.status || u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    blocked: users.filter(u => u.status === 'blocked').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportUsers} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="mb-4 border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedUsers.size} users selected</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedUsers(new Set())}
                >
                  <XSquare className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({ open: true, action: 'activate', status: 'active' })}
                  disabled={bulkActionLoading}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({ open: true, action: 'deactivate', status: 'inactive' })}
                  disabled={bulkActionLoading}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDialog({ open: true, action: 'block', status: 'blocked' })}
                  disabled={bulkActionLoading}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter Pills */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(['all', 'active', 'inactive', 'blocked'] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {statusCounts[status]}
                  </Badge>
                </Button>
              ))}
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>WhatsApp Numbers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow 
                    key={user.id}
                    className={cn(selectedUsers.has(user.id) && "bg-muted/50")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.company_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.whatsapp_count}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.status !== 'active' && (
                            <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'active')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'inactive' && (
                            <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'inactive')}>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.status !== 'blocked' && (
                            <DropdownMenuItem 
                              onClick={() => updateUserStatus(user.id, 'blocked')}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.action} {selectedUsers.size} users? 
              This action will update all selected users at once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDialog.status && handleBulkAction(confirmDialog.status)}
              className={confirmDialog.action === 'block' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {bulkActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}