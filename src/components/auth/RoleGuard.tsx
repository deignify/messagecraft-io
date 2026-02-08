import { Navigate } from 'react-router-dom';
import { useTeamRole } from '@/hooks/useTeamRole';
import { TeamRole } from '@/lib/team-types';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  /** Minimum roles allowed to access this route */
  allowedRoles: TeamRole[];
  /** Redirect path when access denied (defaults to /dashboard/chat) */
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard/chat' }: RoleGuardProps) {
  const { role, loading } = useTeamRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
