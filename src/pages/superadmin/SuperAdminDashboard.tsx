import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCards } from '@/components/superadmin/StatsCards';
import { AnalyticsCharts } from '@/components/superadmin/AnalyticsCharts';
import { RecentActivity } from '@/components/superadmin/RecentActivity';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { startOfDay, subDays, endOfDay } from 'date-fns';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalNumbers: number;
  activeNumbers: number;
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
  messagesYesterday: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalNumbers: 0,
    activeNumbers: 0,
    totalConversations: 0,
    totalMessages: 0,
    messagesToday: 0,
    messagesYesterday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, status');

      if (profilesError) throw profilesError;

      // Fetch WhatsApp numbers
      const { data: numbers, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('id, status');

      if (numbersError) throw numbersError;

      // Fetch conversations count
      const { count: convCount, error: convError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      if (convError) throw convError;

      // Fetch total messages count
      const { count: msgCount, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (msgError) throw msgError;

      // Fetch today's messages
      const today = new Date();
      const { count: todayCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());

      // Fetch yesterday's messages
      const yesterday = subDays(today, 1);
      const { count: yesterdayCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay(yesterday).toISOString())
        .lte('created_at', endOfDay(yesterday).toISOString());

      setStats({
        totalUsers: profiles?.length || 0,
        activeUsers: profiles?.filter(p => p.status === 'active' || !p.status).length || 0,
        blockedUsers: profiles?.filter(p => p.status === 'blocked').length || 0,
        totalNumbers: numbers?.length || 0,
        activeNumbers: numbers?.filter(n => n.status === 'active').length || 0,
        totalConversations: convCount || 0,
        totalMessages: msgCount || 0,
        messagesToday: todayCount || 0,
        messagesYesterday: yesterdayCount || 0,
      });
    } catch (error) {
      console.error('[SuperAdmin] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SuperAdmin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and analytics</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <StatsCards stats={stats} loading={loading} />
      
      <AnalyticsCharts />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}