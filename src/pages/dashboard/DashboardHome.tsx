import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  Users,
  FileText,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  Phone,
  Loader2,
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

interface DashboardStats {
  messagesToday: number;
  totalContacts: number;
  activeTemplates: number;
  activeAutomations: number;
}

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const { selectedNumber, numbers } = useWhatsApp();
  const [stats, setStats] = useState<DashboardStats>({
    messagesToday: 0,
    totalContacts: 0,
    activeTemplates: 0,
    activeAutomations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!selectedNumber || !user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Fetch all stats in parallel
      const [messagesResult, contactsResult, templatesResult, automationsResult, recentMessagesResult] = await Promise.all([
        // Messages today
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('whatsapp_number_id', selectedNumber.id)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        // Total contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('whatsapp_number_id', selectedNumber.id),
        // Active templates (approved)
        supabase
          .from('templates')
          .select('id', { count: 'exact', head: true })
          .eq('whatsapp_number_id', selectedNumber.id)
          .eq('status', 'APPROVED'),
        // Active automations
        supabase
          .from('automations')
          .select('id', { count: 'exact', head: true })
          .eq('whatsapp_number_id', selectedNumber.id)
          .eq('is_active', true),
        // Recent messages for activity
        supabase
          .from('messages')
          .select('id, content, direction, created_at, type')
          .eq('whatsapp_number_id', selectedNumber.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        messagesToday: messagesResult.count || 0,
        totalContacts: contactsResult.count || 0,
        activeTemplates: templatesResult.count || 0,
        activeAutomations: automationsResult.count || 0,
      });

      if (recentMessagesResult.data) {
        setRecentActivity(recentMessagesResult.data);
      }

      setLoading(false);
    };

    fetchStats();

    // Subscribe to real-time updates for messages
    const channel = supabase
      .channel('dashboard-stats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `whatsapp_number_id=eq.${selectedNumber.id}`,
        },
        () => {
          // Refetch stats when new message arrives
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNumber, user]);

  const statsData = [
    {
      icon: MessageCircle,
      label: 'Messages Today',
      value: stats.messagesToday.toString(),
      change: 'Today',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Users,
      label: 'Total Contacts',
      value: stats.totalContacts.toString(),
      change: 'All time',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: FileText,
      label: 'Templates',
      value: stats.activeTemplates.toString(),
      change: 'Approved',
      color: 'text-status-active',
      bgColor: 'bg-status-active/10',
    },
    {
      icon: Zap,
      label: 'Automations',
      value: stats.activeAutomations.toString(),
      change: 'Active',
      color: 'text-status-pending',
      bgColor: 'bg-status-pending/10',
    },
  ];

  const quickActions = [
    {
      icon: MessageCircle,
      label: 'Open Live Chat',
      description: 'View and respond to messages',
      href: '/dashboard/chat',
    },
    {
      icon: Users,
      label: 'Manage Contacts',
      description: 'Add or import contacts',
      href: '/dashboard/contacts',
    },
    {
      icon: Zap,
      label: 'Create Automation',
      description: 'Set up auto-responses',
      href: '/dashboard/automation',
    },
    {
      icon: FileText,
      label: 'Sync Templates',
      description: 'Fetch templates from Meta',
      href: '/dashboard/templates',
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Here's what's happening with your WhatsApp business today.
          </p>
        </div>
        
        {!selectedNumber && numbers.length === 0 && (
          <Button variant="hero" asChild>
            <Link to="/dashboard/numbers">
              <Phone className="h-4 w-4" />
              Connect WhatsApp Number
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statsData.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-4 md:p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-foreground">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="group bg-card rounded-xl border border-border p-4 md:p-5 hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <action.icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-3 md:mt-4 font-medium text-sm md:text-base text-foreground">{action.label}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Recent Activity</h2>
          <div className="bg-card rounded-xl border border-border p-4 md:p-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedNumber ? (
              recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.direction === 'inbound' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate">
                          {activity.type === 'text' 
                            ? (activity.content?.substring(0, 40) + (activity.content?.length > 40 ? '...' : ''))
                            : `[${activity.type}]`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.direction === 'inbound' ? 'Received' : 'Sent'} • {format(new Date(activity.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link to="/dashboard/chat" className="block text-center text-sm text-primary hover:underline pt-2">
                    View all messages →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">Your latest messages will appear here</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No WhatsApp number connected</p>
                <Button variant="brand-outline" size="sm" className="mt-3" asChild>
                  <Link to="/dashboard/numbers">Connect Now</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
