import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Smartphone, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  Home,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/superadmin', icon: BarChart3, label: 'Dashboard', exact: true },
  { path: '/superadmin/users', icon: Users, label: 'Users' },
  { path: '/superadmin/whatsapp', icon: Smartphone, label: 'WhatsApp Accounts' },
  { path: '/superadmin/conversations', icon: MessageSquare, label: 'All Conversations' },
  { path: '/superadmin/settings', icon: Settings, label: 'Settings' },
];

export function SuperAdminLayout() {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="font-bold text-lg">SuperAdmin</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{profile?.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(item.path, item.exact)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link to="/dashboard">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
