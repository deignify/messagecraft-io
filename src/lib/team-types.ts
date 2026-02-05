export type TeamRole = 'admin' | 'manager' | 'agent';

export interface TeamMember {
  id: string;
  workspace_owner_id: string;
  user_id: string;
  role: TeamRole;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profile?: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  workspace_owner_id: string;
  email: string;
  role: TeamRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface ChatAssignment {
  id: string;
  conversation_id: string;
  assigned_to: string;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  // Joined
  assigned_agent?: {
    email: string;
    full_name: string | null;
  };
}

export interface InternalNote {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined
  author?: {
    email: string;
    full_name: string | null;
  };
}

export interface AgentMetrics {
  id: string;
  agent_id: string;
  workspace_owner_id: string;
  date: string;
  messages_sent: number;
  messages_received: number;
  conversations_handled: number;
  conversations_resolved: number;
  total_response_time_seconds: number;
  response_count: number;
  first_response_time_seconds: number;
  first_response_count: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  role: TeamRole;
  total_messages_sent: number;
  total_messages_received: number;
  total_conversations: number;
  resolved_conversations: number;
  resolution_rate: number;
  avg_response_time: number;
  avg_first_response_time: number;
}

export const ROLE_PERMISSIONS = {
  admin: {
    canInviteMembers: true,
    canRemoveMembers: true,
    canAssignChats: true,
    canViewAllChats: true,
    canViewMetrics: true,
    canManageSettings: true,
  },
  manager: {
    canInviteMembers: true,
    canRemoveMembers: false,
    canAssignChats: true,
    canViewAllChats: true,
    canViewMetrics: true,
    canManageSettings: false,
  },
  agent: {
    canInviteMembers: false,
    canRemoveMembers: false,
    canAssignChats: false,
    canViewAllChats: false,
    canViewMetrics: false,
    canManageSettings: false,
  },
} as const;

export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  admin: 'Full access to all features including team management',
  manager: 'Can assign chats and view performance metrics',
  agent: 'Can handle assigned chats and add internal notes',
};
