import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TeamMember, 
  TeamInvitation, 
  ChatAssignment, 
  InternalNote, 
  AgentMetrics,
  AgentPerformance,
  TeamRole 
} from '@/lib/team-types';
import { toast } from 'sonner';

export function useTeam() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First check if the user is a team member of another workspace
      const { data: myMembership } = await supabase
        .from('team_members')
        .select('workspace_owner_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      // Determine the workspace owner ID
      const effectiveWorkspaceOwnerId = myMembership?.workspace_owner_id || user.id;
      setWorkspaceOwnerId(effectiveWorkspaceOwnerId);
      setIsWorkspaceOwner(effectiveWorkspaceOwnerId === user.id);

      // Fetch team members for this workspace
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('workspace_owner_id', effectiveWorkspaceOwnerId);

      if (membersError) throw membersError;

      // Build members list - include workspace owner as virtual admin
      const allMembers: TeamMember[] = [];
      
      // Get the workspace owner's profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', effectiveWorkspaceOwnerId)
        .single();

      // Add workspace owner as virtual "admin" member (always first)
      if (ownerProfile) {
        allMembers.push({
          id: `owner-${effectiveWorkspaceOwnerId}`,
          workspace_owner_id: effectiveWorkspaceOwnerId,
          user_id: effectiveWorkspaceOwnerId,
          role: 'admin' as TeamRole,
          is_available: true,
          created_at: '',
          updated_at: '',
          profile: ownerProfile,
        });
      }

      // Fetch profiles for team members
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        membersData.forEach(m => {
          // Skip if this is the workspace owner (already added above)
          if (m.user_id !== effectiveWorkspaceOwnerId) {
            allMembers.push({
              ...m,
              role: m.role as TeamRole,
              profile: profileMap.get(m.user_id) || undefined,
            });
          }
        });
      }
        
      setMembers(allMembers);

      // Fetch pending invitations for the workspace (visible to workspace owner and team admins)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('workspace_owner_id', effectiveWorkspaceOwnerId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (invitationsError) throw invitationsError;
      setInvitations((invitationsData || []).map(inv => ({
        ...inv,
        role: inv.role as TeamRole,
      })));

      // Fetch invitations received by the current user (by email)
      const { data: receivedData } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('email', user.email!)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      setReceivedInvitations((receivedData || []).map(inv => ({
        ...inv,
        role: inv.role as TeamRole,
      })));

    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const inviteMember = async (email: string, role: TeamRole) => {
    if (!user || !workspaceOwnerId) return null;

    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          workspace_owner_id: workspaceOwnerId,
          email,
          role,
        })
        .select()
        .single();

      if (error) throw error;

      setInvitations(prev => [...prev, { ...data, role: data.role as TeamRole }]);
      toast.success(`Invitation sent to ${email}`);
      return data;
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Failed to send invitation');
      return null;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      // Find the invitation
      const invitation = receivedInvitations.find(i => i.id === invitationId);
      if (!invitation) {
        toast.error('Invitation not found');
        return;
      }

      // Add user as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          workspace_owner_id: invitation.workspace_owner_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      setReceivedInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast.success('Invitation accepted! You are now a team member.');
      
      // Refresh to load workspace data
      await fetchTeamData();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('You are already a member of this workspace');
      } else {
        toast.error('Failed to accept invitation');
      }
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      // Just remove from the received list (don't delete - owner should still see it)
      // Mark as declined by setting accepted_at to a special value or just filtering
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('email', user?.email!);

      if (error) throw error;

      setReceivedInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    }
  };

  const updateMemberRole = async (memberId: string, newRole: TeamRole) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success('Member role updated');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Team member removed');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const toggleAvailability = async (memberId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, is_available: isAvailable } : m
      ));
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  return {
    members,
    invitations,
    receivedInvitations,
    loading,
    workspaceOwnerId,
    isWorkspaceOwner,
    refetch: fetchTeamData,
    inviteMember,
    cancelInvitation,
    acceptInvitation,
    declineInvitation,
    updateMemberRole,
    removeMember,
    toggleAvailability,
  };
}

export function useChatAssignment(conversationId?: string) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ChatAssignment | null>(null);
  const [availableAgents, setAvailableAgents] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignment = useCallback(async () => {
    if (!conversationId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_assignments')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setAssignment(data);
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  const fetchAvailableAgents = useCallback(async () => {
    if (!user) return;

    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('workspace_owner_id', user.id)
        .eq('is_available', true);

      if (error) throw error;

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setAvailableAgents(members.map(m => ({
          ...m,
          role: m.role as TeamRole,
          profile: profileMap.get(m.user_id),
        })));
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignment();
    fetchAvailableAgents();
  }, [fetchAssignment, fetchAvailableAgents]);

  const assignChat = async (agentUserId: string) => {
    if (!conversationId || !user) return;

    try {
      // Deactivate existing assignment
      if (assignment) {
        await supabase
          .from('chat_assignments')
          .update({ is_active: false, unassigned_at: new Date().toISOString() })
          .eq('id', assignment.id);
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('chat_assignments')
        .insert({
          conversation_id: conversationId,
          assigned_to: agentUserId,
          assigned_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setAssignment(data);
      toast.success('Chat assigned successfully');
    } catch (error) {
      console.error('Error assigning chat:', error);
      toast.error('Failed to assign chat');
    }
  };

  const unassignChat = async () => {
    if (!assignment) return;

    try {
      const { error } = await supabase
        .from('chat_assignments')
        .update({ is_active: false, unassigned_at: new Date().toISOString() })
        .eq('id', assignment.id);

      if (error) throw error;

      setAssignment(null);
      toast.success('Chat unassigned');
    } catch (error) {
      console.error('Error unassigning chat:', error);
      toast.error('Failed to unassign chat');
    }
  };

  return {
    assignment,
    availableAgents,
    loading,
    assignChat,
    unassignChat,
    refetch: fetchAssignment,
  };
}

export function useInternalNotes(conversationId?: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(n => n.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setNotes(data.map(n => ({
          ...n,
          author: profileMap.get(n.user_id),
        })));
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (content: string) => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('internal_notes')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [{ ...data, author: { email: user.email!, full_name: null } }, ...prev]);
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('internal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  return {
    notes,
    loading,
    addNote,
    deleteNote,
    refetch: fetchNotes,
  };
}

export function useAgentPerformance() {
  const { user } = useAuth();
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });

  const fetchPerformance = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('workspace_owner_id', user.id)
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0]);

      if (metricsError) throw metricsError;

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('workspace_owner_id', user.id);

      if (membersError) throw membersError;

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Aggregate metrics by agent
        const agentMetrics = new Map<string, {
          messages_sent: number;
          messages_received: number;
          conversations_handled: number;
          conversations_resolved: number;
          total_response_time: number;
          response_count: number;
          first_response_time: number;
          first_response_count: number;
        }>();

        metrics?.forEach(m => {
          const existing = agentMetrics.get(m.agent_id) || {
            messages_sent: 0,
            messages_received: 0,
            conversations_handled: 0,
            conversations_resolved: 0,
            total_response_time: 0,
            response_count: 0,
            first_response_time: 0,
            first_response_count: 0,
          };

          agentMetrics.set(m.agent_id, {
            messages_sent: existing.messages_sent + m.messages_sent,
            messages_received: existing.messages_received + m.messages_received,
            conversations_handled: existing.conversations_handled + m.conversations_handled,
            conversations_resolved: existing.conversations_resolved + m.conversations_resolved,
            total_response_time: existing.total_response_time + m.total_response_time_seconds,
            response_count: existing.response_count + m.response_count,
            first_response_time: existing.first_response_time + m.first_response_time_seconds,
            first_response_count: existing.first_response_count + m.first_response_count,
          });
        });

        const performanceData: AgentPerformance[] = members.map(member => {
          const profile = profileMap.get(member.user_id);
          const agentData = agentMetrics.get(member.user_id);

          return {
            agent_id: member.user_id,
            agent_name: profile?.full_name || 'Unknown',
            agent_email: profile?.email || '',
            role: member.role as TeamRole,
            total_messages_sent: agentData?.messages_sent || 0,
            total_messages_received: agentData?.messages_received || 0,
            total_conversations: agentData?.conversations_handled || 0,
            resolved_conversations: agentData?.conversations_resolved || 0,
            resolution_rate: agentData?.conversations_handled 
              ? (agentData.conversations_resolved / agentData.conversations_handled) * 100 
              : 0,
            avg_response_time: agentData?.response_count 
              ? agentData.total_response_time / agentData.response_count 
              : 0,
            avg_first_response_time: agentData?.first_response_count 
              ? agentData.first_response_time / agentData.first_response_count 
              : 0,
          };
        });

        setPerformance(performanceData);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return {
    performance,
    loading,
    dateRange,
    setDateRange,
    refetch: fetchPerformance,
  };
}
