import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useTeamRole } from '@/hooks/useTeamRole';
import { TeamRole } from '@/lib/team-types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  LayoutDashboard,
  Phone,
  MessageCircle,
  Users,
  FileText,
  Zap,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Plus,
  Building2,
  Shield,
  UsersRound,
  MousePointerClick,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define which roles can access each nav item
type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: TeamRole[]; // which roles can see this item
};

// Full sidebar nav items with role access
const allNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'manager'] },
  { icon: Phone, label: 'WhatsApp Numbers', path: '/dashboard/numbers', roles: ['admin'] },
  { icon: MessageCircle, label: 'Live Chat', path: '/dashboard/chat', roles: ['admin', 'manager', 'agent'] },
  { icon: Users, label: 'Contacts', path: '/dashboard/contacts', roles: ['admin', 'manager'] },
  { icon: FileText, label: 'Templates', path: '/dashboard/templates', roles: ['admin', 'manager'] },
  { icon: Building2, label: 'Automation', path: '/dashboard/automation', roles: ['admin'] },
  { icon: MousePointerClick, label: 'CTWA Ads', path: '/dashboard/ctwa-ads', roles: ['admin', 'manager'] },
  { icon: Megaphone, label: 'Campaigns', path: '/dashboard/campaigns', roles: ['admin', 'manager'] },
  { icon: UsersRound, label: 'Team', path: '/dashboard/team', roles: ['admin', 'manager'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['admin', 'manager'] },
];

// Mobile bottom nav items with role access
const allMobileNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard', roles: ['admin', 'manager'] },
  { icon: MessageCircle, label: 'Chat', path: '/dashboard/chat', roles: ['admin', 'manager', 'agent'] },
  { icon: Users, label: 'Contacts', path: '/dashboard/contacts', roles: ['admin', 'manager'] },
  { icon: Building2, label: 'Hotel', path: '/dashboard/automation', roles: ['admin'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['admin', 'manager'] },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { numbers, selectedNumber, selectNumber } = useWhatsApp();
  const { isSuperAdmin } = useSuperAdmin();
  const { role } = useTeamRole();
  const location = useLocation();

  // Filter nav items based on user's team role
  const navItems = allNavItems.filter(item => item.roles.includes(role));
  const mobileNavItems = allMobileNavItems.filter(item => item.roles.includes(role));

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && (
              <span className="text-lg font-display font-bold text-sidebar-foreground">
                Chat Setu
              </span>
            )}
          </Link>
        </div>

        {/* WhatsApp Number Selector */}
        {sidebarOpen && numbers.length > 0 && (
          <div className="p-4 border-b border-sidebar-border">
            <Select
              value={selectedNumber?.id || ''}
              onValueChange={selectNumber}
            >
              <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder="Select a number" />
              </SelectTrigger>
              <SelectContent>
                {numbers.map((num) => (
                  <SelectItem key={num.id} value={num.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          num.status === 'active' ? "status-active" : "status-pending"
                        )}
                      />
                      <span>{num.display_name || num.phone_number}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent w-full justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border animate-slide-in-right">
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-display font-bold text-sidebar-foreground">
                  Chat Setu
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className={cn(
          "h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card",
          // Hide header on mobile when on chat page (chat has its own header)
          location.pathname === '/dashboard/chat' && "hidden lg:flex"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Right side */}
          <div className="flex items-center gap-4 ml-auto">
            {!selectedNumber && numbers.length === 0 && (
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard/numbers">
                  <Plus className="h-4 w-4" />
                  Connect WhatsApp
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium max-w-32 truncate">
                    {profile?.full_name || user?.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/superadmin" className="cursor-pointer">
                      <Shield className="h-4 w-4 mr-2 text-destructive" />
                      SuperAdmin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content - extra padding bottom for mobile nav, none on chat page */}
        <main className={cn(
          "flex-1 overflow-auto lg:pb-0",
          location.pathname === '/dashboard/chat' ? "pb-0" : "pb-16"
        )}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom",
        location.pathname === '/dashboard/chat' && "hidden"
      )}>
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
