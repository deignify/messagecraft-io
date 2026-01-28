import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Smartphone, MessageSquare, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalNumbers: number;
  activeNumbers: number;
  totalConversations: number;
  totalMessages: number;
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
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

      // Fetch messages count
      const { count: msgCount, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (msgError) throw msgError;

      setStats({
        totalUsers: profiles?.length || 0,
        activeUsers: profiles?.filter(p => p.status === 'active' || !p.status).length || 0,
        blockedUsers: profiles?.filter(p => p.status === 'blocked').length || 0,
        totalNumbers: numbers?.length || 0,
        activeNumbers: numbers?.filter(n => n.status === 'active').length || 0,
        totalConversations: convCount || 0,
        totalMessages: msgCount || 0,
      });
    } catch (error) {
      console.error('[SuperAdmin] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'text-blue-500',
      subtitle: `${stats.activeUsers} active, ${stats.blockedUsers} blocked`
    },
    { 
      title: 'WhatsApp Numbers', 
      value: stats.totalNumbers, 
      icon: Smartphone, 
      color: 'text-green-500',
      subtitle: `${stats.activeNumbers} connected`
    },
    { 
      title: 'Total Conversations', 
      value: stats.totalConversations, 
      icon: MessageSquare, 
      color: 'text-purple-500',
      subtitle: 'Across all users'
    },
    { 
      title: 'Total Messages', 
      value: stats.totalMessages, 
      icon: Activity, 
      color: 'text-orange-500',
      subtitle: 'All time'
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SuperAdmin Dashboard</h1>
        <p className="text-muted-foreground">Manage all users and WhatsApp accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
