import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface MessageTrend {
  date: string;
  inbound: number;
  outbound: number;
}

interface UserGrowth {
  date: string;
  users: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function AnalyticsCharts() {
  const [messageTrends, setMessageTrends] = useState<MessageTrend[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [userStatus, setUserStatus] = useState<StatusDistribution[]>([]);
  const [numberStatus, setNumberStatus] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get last 14 days of messages for trends
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        return format(date, 'yyyy-MM-dd');
      });

      // Fetch messages for trend data
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('created_at, direction')
        .gte('created_at', startOfDay(subDays(new Date(), 14)).toISOString())
        .lte('created_at', endOfDay(new Date()).toISOString());

      if (msgError) throw msgError;

      // Aggregate message trends
      const trendMap: Record<string, { inbound: number; outbound: number }> = {};
      last14Days.forEach(date => {
        trendMap[date] = { inbound: 0, outbound: 0 };
      });

      messages?.forEach(msg => {
        const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
        if (trendMap[date]) {
          if (msg.direction === 'inbound') {
            trendMap[date].inbound++;
          } else {
            trendMap[date].outbound++;
          }
        }
      });

      const trends: MessageTrend[] = last14Days.map(date => ({
        date: format(new Date(date), 'MMM d'),
        inbound: trendMap[date].inbound,
        outbound: trendMap[date].outbound,
      }));

      setMessageTrends(trends);

      // Fetch user profiles for growth and status
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('created_at, status');

      if (profError) throw profError;

      // User growth over last 14 days (cumulative)
      let cumulativeUsers = 0;
      const growthData: UserGrowth[] = last14Days.map(date => {
        const usersUpToDate = profiles?.filter(p => 
          format(new Date(p.created_at), 'yyyy-MM-dd') <= date
        ).length || 0;
        return {
          date: format(new Date(date), 'MMM d'),
          users: usersUpToDate,
        };
      });

      setUserGrowth(growthData);

      // User status distribution
      const statusCount = {
        active: profiles?.filter(p => !p.status || p.status === 'active').length || 0,
        inactive: profiles?.filter(p => p.status === 'inactive').length || 0,
        blocked: profiles?.filter(p => p.status === 'blocked').length || 0,
      };

      setUserStatus([
        { name: 'Active', value: statusCount.active, color: 'hsl(var(--chart-1))' },
        { name: 'Inactive', value: statusCount.inactive, color: 'hsl(var(--chart-2))' },
        { name: 'Blocked', value: statusCount.blocked, color: 'hsl(var(--chart-3))' },
      ].filter(s => s.value > 0));

      // Fetch WhatsApp numbers for status
      const { data: numbers, error: numError } = await supabase
        .from('whatsapp_numbers')
        .select('status');

      if (numError) throw numError;

      const numStatusCount = {
        active: numbers?.filter(n => n.status === 'active').length || 0,
        pending: numbers?.filter(n => n.status === 'pending').length || 0,
        disconnected: numbers?.filter(n => n.status === 'disconnected').length || 0,
        error: numbers?.filter(n => n.status === 'error').length || 0,
      };

      setNumberStatus([
        { name: 'Active', value: numStatusCount.active, color: 'hsl(var(--chart-1))' },
        { name: 'Pending', value: numStatusCount.pending, color: 'hsl(var(--chart-2))' },
        { name: 'Disconnected', value: numStatusCount.disconnected, color: 'hsl(var(--chart-3))' },
        { name: 'Error', value: numStatusCount.error, color: 'hsl(var(--chart-4))' },
      ].filter(s => s.value > 0));

    } catch (error) {
      console.error('[Analytics] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Message Trends Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Message Volume (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={messageTrends}>
                <defs>
                  <linearGradient id="inboundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outboundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Inbound"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#inboundGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Outbound"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#outboundGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="users" 
                  name="Total Users"
                  fill="hsl(var(--chart-1))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">Users</p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {userStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">WhatsApp Numbers</p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={numberStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {numberStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}