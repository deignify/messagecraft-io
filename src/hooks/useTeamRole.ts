import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamRole, ROLE_PERMISSIONS } from '@/lib/team-types';

interface TeamRoleInfo {
  role: TeamRole;
  isWorkspaceOwner: boolean;
  workspaceOwnerId: string | null;
  loading: boolean;
  permissions: typeof ROLE_PERMISSIONS[TeamRole];
}

export function useTeamRole(): TeamRoleInfo {
  const { user } = useAuth();
  const [role, setRole] = useState<TeamRole>('admin');
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(true);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is a team member of another workspace
      const { data: membership } = await supabase
        .from('team_members')
        .select('workspace_owner_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        // User is a team member — use their assigned role
        setRole(membership.role as TeamRole);
        setIsWorkspaceOwner(false);
        setWorkspaceOwnerId(membership.workspace_owner_id);
      } else {
        // User is a workspace owner (or standalone user) — full admin
        setRole('admin');
        setIsWorkspaceOwner(true);
        setWorkspaceOwnerId(user.id);
      }
    } catch (error) {
      console.error('Error fetching team role:', error);
      // Default to admin for standalone users
      setRole('admin');
      setIsWorkspaceOwner(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    isWorkspaceOwner,
    workspaceOwnerId,
    loading,
    permissions: ROLE_PERMISSIONS[role],
  };
}
