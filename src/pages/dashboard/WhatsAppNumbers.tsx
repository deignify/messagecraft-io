import { useState, useEffect } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Phone,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Unlink,
  Wifi,
  WifiOff,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppNumber } from '@/lib/supabase-types';

export default function WhatsAppNumbers() {
  const { numbers, selectedNumber, selectNumber, refreshNumbers, loading } = useWhatsApp();
  const { session } = useAuth();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [numberToUnlink, setNumberToUnlink] = useState<WhatsAppNumber | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [syncingTokens, setSyncingTokens] = useState(false);

  // Handle OAuth callback results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const numbersCount = urlParams.get('numbers');

    if (success === 'true') {
      toast.success(`Successfully connected ${numbersCount || '0'} WhatsApp number(s)!`);
      refreshNumbers();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'token_exchange_failed': 'Failed to connect with Meta. Please try again.',
        'waba_fetch_failed': 'Failed to fetch WhatsApp accounts. Please try again.',
        'not_authenticated': 'Please log in before connecting WhatsApp.',
      };
      toast.error(errorMessages[error] || 'Connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshNumbers]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-status-active" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-status-pending" />;
      case 'error':
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-status-error" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending Verification';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return status;
    }
  };

  const handleConnect = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to connect WhatsApp');
      return;
    }

    // Generate the Meta OAuth URL via an authenticated call (so the backend can embed user_id in state)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'hevojjzymlfyjmhprcnt';
    const functionBaseUrl = `https://${projectId}.supabase.co/functions/v1/meta-oauth`;
    const returnUrl = `${window.location.origin}/dashboard/numbers`;

    try {
      const res = await fetch(`${functionBaseUrl}?action=get-auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          redirect_uri: functionBaseUrl,
          return_url: returnUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.auth_url) {
        throw new Error(data?.error || 'Failed to start Meta OAuth');
      }

      window.location.href = data.auth_url;
    } catch (err) {
      console.error('Failed to start Meta OAuth:', err);
      toast.error('Failed to start Meta OAuth. Please try again.');
    }
  };

  const handleUnlinkClick = (e: React.MouseEvent, number: WhatsAppNumber) => {
    e.stopPropagation();
    setNumberToUnlink(number);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!numberToUnlink) return;
    
    setUnlinking(true);
    try {
      // Instead of deleting data, just mark the number as disconnected
      // This preserves all chats, automations, contacts, and templates
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          status: 'disconnected',
          access_token: '', // Clear the token for security
        })
        .eq('id', numberToUnlink.id);

      if (error) throw error;

      console.log('[WhatsApp] Number disconnected, data preserved:', {
        numberId: numberToUnlink.id,
        phoneNumber: numberToUnlink.phone_number,
        status: 'disconnected'
      });

      toast.success(`Disconnected ${numberToUnlink.display_name || numberToUnlink.phone_number}. All data has been preserved.`);
      await refreshNumbers();
    } catch (err) {
      console.error('[WhatsApp] Failed to disconnect number:', err);
      toast.error('Failed to disconnect WhatsApp number. Please try again.');
    } finally {
      setUnlinking(false);
      setUnlinkDialogOpen(false);
      setNumberToUnlink(null);
    }
  };

  // Permanent delete - only for already disconnected numbers
  const handlePermanentDelete = async () => {
    if (!numberToUnlink) return;
    
    setUnlinking(true);
    try {
      // First get automation IDs for this WhatsApp number
      const { data: automations } = await supabase
        .from('automations')
        .select('id')
        .eq('whatsapp_number_id', numberToUnlink.id);

      const automationIds = automations?.map(a => a.id) || [];

      // Delete automation-related data if there are any automations
      if (automationIds.length > 0) {
        await supabase
          .from('automation_sessions')
          .delete()
          .in('automation_id', automationIds);

        await supabase
          .from('automation_steps')
          .delete()
          .in('automation_id', automationIds);

        await supabase
          .from('automations')
          .delete()
          .eq('whatsapp_number_id', numberToUnlink.id);
      }

      // Delete hotel-related data
      const { data: hotels } = await supabase
        .from('hotels')
        .select('id')
        .eq('whatsapp_number_id', numberToUnlink.id);

      if (hotels && hotels.length > 0) {
        const hotelIds = hotels.map(h => h.id);
        
        await supabase
          .from('hotel_bookings')
          .delete()
          .in('hotel_id', hotelIds);

        await supabase
          .from('hotel_offers')
          .delete()
          .in('hotel_id', hotelIds);

        // Get room type IDs to delete photos
        const { data: roomTypes } = await supabase
          .from('room_types')
          .select('id')
          .in('hotel_id', hotelIds);

        if (roomTypes && roomTypes.length > 0) {
          await supabase
            .from('room_photos')
            .delete()
            .in('room_type_id', roomTypes.map(r => r.id));
        }

        await supabase
          .from('room_types')
          .delete()
          .in('hotel_id', hotelIds);

        await supabase
          .from('hotels')
          .delete()
          .eq('whatsapp_number_id', numberToUnlink.id);
      }

      // Delete messages, conversations, contacts, templates
      await supabase
        .from('messages')
        .delete()
        .eq('whatsapp_number_id', numberToUnlink.id);

      await supabase
        .from('conversations')
        .delete()
        .eq('whatsapp_number_id', numberToUnlink.id);

      await supabase
        .from('contacts')
        .delete()
        .eq('whatsapp_number_id', numberToUnlink.id);

      await supabase
        .from('templates')
        .delete()
        .eq('whatsapp_number_id', numberToUnlink.id);

      await supabase
        .from('message_templates')
        .delete()
        .eq('whatsapp_number_id', numberToUnlink.id);

      // Finally delete the WhatsApp number itself
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberToUnlink.id);

      if (error) throw error;

      console.log('[WhatsApp] Number permanently deleted:', {
        numberId: numberToUnlink.id,
        phoneNumber: numberToUnlink.phone_number
      });

      toast.success(`Permanently removed ${numberToUnlink.display_name || numberToUnlink.phone_number}`);
      await refreshNumbers();
    } catch (err) {
      console.error('[WhatsApp] Failed to permanently delete number:', err);
      toast.error('Failed to remove WhatsApp number. Please try again.');
    } finally {
      setUnlinking(false);
      setUnlinkDialogOpen(false);
      setNumberToUnlink(null);
    }
  };

  // Check connection status by testing the API
  const checkConnectionStatus = async (number: WhatsAppNumber) => {
    if (!number.access_token || number.status === 'disconnected') {
      return { connected: false, reason: 'No access token or disconnected' };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${number.phone_number_id}`,
        {
          headers: { 'Authorization': `Bearer ${number.access_token}` }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log('[WhatsApp] Connection check failed:', {
          numberId: number.id,
          error: data.error
        });
        
        // Update status to error if API fails
        await supabase
          .from('whatsapp_numbers')
          .update({ status: 'error' })
          .eq('id', number.id);
          
        return { connected: false, reason: data.error?.message || 'API error' };
      }

      // Update status to active if API succeeds
      if (number.status !== 'active') {
        await supabase
          .from('whatsapp_numbers')
          .update({ status: 'active' })
          .eq('id', number.id);
      }

      console.log('[WhatsApp] Connection verified:', {
        numberId: number.id,
        displayName: data.verified_name || data.display_phone_number
      });

      return { connected: true, data };
    } catch (err) {
      console.error('[WhatsApp] Connection check error:', err);
      return { connected: false, reason: 'Network error' };
    }
  };

  const handleVerifyConnection = async (e: React.MouseEvent, number: WhatsAppNumber) => {
    e.stopPropagation();
    toast.loading('Checking connection...', { id: 'verify-connection' });
    
    const result = await checkConnectionStatus(number);
    await refreshNumbers();
    
    if (result.connected) {
      toast.success('Connection verified successfully!', { id: 'verify-connection' });
    } else {
      toast.error(`Connection failed: ${result.reason}. Try "Sync All Tokens" to fix.`, { id: 'verify-connection' });
    }
  };

  // Sync all tokens by re-authenticating with Meta
  // This fixes the issue where connecting a new number invalidates tokens for existing numbers
  const handleSyncAllTokens = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to sync tokens');
      return;
    }

    setSyncingTokens(true);
    toast.loading('Syncing tokens with Meta...', { id: 'sync-tokens' });

    try {
      // Trigger the OAuth flow which will update tokens for ALL numbers from the same FB account
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'hevojjzymlfyjmhprcnt';
      const functionBaseUrl = `https://${projectId}.supabase.co/functions/v1/meta-oauth`;
      const returnUrl = `${window.location.origin}/dashboard/numbers`;

      const res = await fetch(`${functionBaseUrl}?action=get-auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          redirect_uri: functionBaseUrl,
          return_url: returnUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.auth_url) {
        throw new Error(data?.error || 'Failed to start token sync');
      }

      toast.dismiss('sync-tokens');
      window.location.href = data.auth_url;
    } catch (err) {
      console.error('[WhatsApp] Token sync failed:', err);
      toast.error('Failed to sync tokens. Please try again.', { id: 'sync-tokens' });
      setSyncingTokens(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            WhatsApp Numbers
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect and manage your WhatsApp Business API numbers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {numbers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncAllTokens} 
              disabled={syncingTokens || loading}
              title="Re-authenticate with Meta to refresh tokens for all numbers from the same Facebook account"
            >
              <RefreshCw className={cn("h-4 w-4", syncingTokens && "animate-spin")} />
              Sync All Tokens
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refreshNumbers} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4" />
                Connect Number
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Connect WhatsApp Number</DialogTitle>
                <DialogDescription>
                  Connect your WhatsApp Business number through Meta's OAuth flow.
                  You'll be redirected to Meta to authorize access.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="bg-muted rounded-lg p-4 text-sm">
                  <h4 className="font-medium mb-2">Before you begin:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Have a Meta Business Account ready</li>
                    <li>WhatsApp Business API access approved</li>
                    <li>At least one phone number registered</li>
                  </ul>
                </div>
                
                <Button variant="hero" className="w-full" onClick={handleConnect}>
                  <ExternalLink className="h-4 w-4" />
                  Connect with Meta
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  You'll be redirected to Meta to authorize your WhatsApp Business Account
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert for numbers with errors */}
      {numbers.some(n => n.status === 'error') && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Some numbers have connection issues
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This often happens when you connect multiple numbers from the same Facebook account. 
              Click <strong>"Sync All Tokens"</strong> to re-authenticate and fix all numbers at once.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncAllTokens}
            disabled={syncingTokens}
            className="border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className={cn("h-4 w-4", syncingTokens && "animate-spin")} />
            Fix Now
          </Button>
        </div>
      )}

      {/* Numbers List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : numbers.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No WhatsApp numbers connected
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your first WhatsApp Business API number to start sending 
            and receiving messages.
          </p>
          <Button variant="hero" onClick={() => setConnectDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Connect Your First Number
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {numbers.map((number) => (
            <div
              key={number.id}
              className={cn(
                "bg-card rounded-xl border p-5 transition-all cursor-pointer hover:shadow-md",
                selectedNumber?.id === number.id
                  ? "border-primary shadow-md"
                  : "border-border"
              )}
              onClick={() => selectNumber(number.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    number.status === 'active' ? "bg-status-active/10" : "bg-muted"
                  )}>
                    <Phone className={cn(
                      "h-6 w-6",
                      number.status === 'active' ? "text-status-active" : "text-muted-foreground"
                    )} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {number.display_name || number.phone_number}
                      </h3>
                      {selectedNumber?.id === number.id && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {number.phone_number}
                    </p>
                    {number.business_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {number.business_name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(number.status)}
                      <span className="text-sm font-medium">
                        {getStatusLabel(number.status)}
                      </span>
                    </div>
                    {number.quality_rating && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Quality: {number.quality_rating}
                      </p>
                    )}
                  </div>
                  
                  {/* Verify Connection Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    onClick={(e) => handleVerifyConnection(e, number)}
                    title="Verify connection"
                  >
                    <Wifi className="h-4 w-4" />
                  </Button>
                  
                  {/* Reconnect Button - shows for disconnected numbers */}
                  {number.status === 'disconnected' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectDialogOpen(true);
                      }}
                      title="Reconnect this number"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleUnlinkClick(e, number)}
                    title={number.status === 'disconnected' ? 'Remove number' : 'Disconnect number'}
                  >
                    {number.status === 'disconnected' ? (
                      <WifiOff className="h-4 w-4" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect/Remove Confirmation Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {numberToUnlink?.status === 'disconnected' 
                ? 'Permanently Remove Number?' 
                : 'Disconnect WhatsApp Number?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {numberToUnlink?.status === 'disconnected' ? (
                  <>
                    Are you sure you want to permanently remove{' '}
                    <span className="font-semibold">
                      {numberToUnlink?.display_name || numberToUnlink?.phone_number}
                    </span>
                    ?
                  </>
                ) : (
                  <>
                    Disconnect{' '}
                    <span className="font-semibold">
                      {numberToUnlink?.display_name || numberToUnlink?.phone_number}
                    </span>
                    ?
                  </>
                )}
              </p>
              {numberToUnlink?.status === 'disconnected' ? (
                <>
                  <p className="text-destructive">
                    This will permanently delete all associated data:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>All conversations and messages</li>
                    <li>All contacts linked to this number</li>
                    <li>All message templates</li>
                    <li>All automations and their sessions</li>
                  </ul>
                  <p className="text-sm font-medium mt-2">
                    This action cannot be undone.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-primary font-medium">
                    ✓ All your data will be preserved:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Conversations and messages will remain</li>
                    <li>Contacts will be kept</li>
                    <li>Templates will be saved</li>
                    <li>Automations will be paused but preserved</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can reconnect this number anytime to restore full functionality.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={numberToUnlink?.status === 'disconnected' ? handlePermanentDelete : handleUnlinkConfirm}
              disabled={unlinking}
              className={numberToUnlink?.status === 'disconnected' 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
              }
            >
              {unlinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {numberToUnlink?.status === 'disconnected' ? 'Removing...' : 'Disconnecting...'}
                </>
              ) : (
                numberToUnlink?.status === 'disconnected' ? 'Remove Permanently' : 'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
