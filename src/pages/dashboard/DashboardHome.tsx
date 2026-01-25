import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
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
} from 'lucide-react';

export default function DashboardHome() {
  const { profile } = useAuth();
  const { selectedNumber, numbers } = useWhatsApp();

  const stats = [
    {
      icon: MessageCircle,
      label: 'Messages Today',
      value: '0',
      change: '+0%',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Users,
      label: 'Total Contacts',
      value: '0',
      change: '+0%',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: FileText,
      label: 'Templates',
      value: '0',
      change: 'Active',
      color: 'text-status-active',
      bgColor: 'bg-status-active/10',
    },
    {
      icon: Zap,
      label: 'Automations',
      value: '0',
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
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="group bg-card rounded-xl border border-border p-5 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 font-medium text-foreground">{action.label}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="bg-card rounded-xl border border-border p-5">
            {selectedNumber ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Your latest messages will appear here</p>
              </div>
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
