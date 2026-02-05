-- Create team_role enum
CREATE TYPE public.team_role AS ENUM ('admin', 'manager', 'agent');

-- Create team_invitations table for email invites
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_owner_id UUID NOT NULL,
    email TEXT NOT NULL,
    role team_role NOT NULL DEFAULT 'agent',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_owner_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role team_role NOT NULL DEFAULT 'agent',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(workspace_owner_id, user_id)
);

-- Create chat_assignments table
CREATE TABLE public.chat_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create internal_notes table (not visible to customers)
CREATE TABLE public.internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_metrics table for performance tracking
CREATE TABLE public.agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    workspace_owner_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    conversations_handled INTEGER DEFAULT 0,
    conversations_resolved INTEGER DEFAULT 0,
    total_response_time_seconds BIGINT DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    first_response_time_seconds BIGINT DEFAULT 0,
    first_response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(agent_id, workspace_owner_id, date)
);

-- Add auto_assign_enabled to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;

-- Create helper function to check team role
CREATE OR REPLACE FUNCTION public.get_team_role(_user_id UUID, _workspace_owner_id UUID)
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.team_members
  WHERE user_id = _user_id AND workspace_owner_id = _workspace_owner_id
  LIMIT 1;
$$;

-- Create helper function to check if user is workspace owner or team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _workspace_owner_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND workspace_owner_id = _workspace_owner_id
  ) OR _user_id = _workspace_owner_id;
$$;

-- RLS Policies for team_invitations
CREATE POLICY "Workspace owners can manage invitations"
ON public.team_invitations FOR ALL
USING (auth.uid() = workspace_owner_id);

CREATE POLICY "Anyone can view their own invitation by token"
ON public.team_invitations FOR SELECT
USING (true);

-- RLS Policies for team_members
CREATE POLICY "Workspace owners can manage team members"
ON public.team_members FOR ALL
USING (auth.uid() = workspace_owner_id);

CREATE POLICY "Team members can view their team"
ON public.team_members FOR SELECT
USING (is_team_member(auth.uid(), workspace_owner_id));

-- RLS Policies for chat_assignments
CREATE POLICY "Workspace owners and team can view assignments"
ON public.chat_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND is_team_member(auth.uid(), c.user_id)
  )
);

CREATE POLICY "Admins and managers can manage assignments"
ON public.chat_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND (
      c.user_id = auth.uid() 
      OR get_team_role(auth.uid(), c.user_id) IN ('admin', 'manager')
    )
  )
);

-- RLS Policies for internal_notes
CREATE POLICY "Team members can view internal notes"
ON public.internal_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND is_team_member(auth.uid(), c.user_id)
  )
);

CREATE POLICY "Team members can create internal notes"
ON public.internal_notes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND is_team_member(auth.uid(), c.user_id)
  )
);

CREATE POLICY "Users can update own notes"
ON public.internal_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
ON public.internal_notes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for agent_metrics
CREATE POLICY "Workspace owners can view all metrics"
ON public.agent_metrics FOR SELECT
USING (auth.uid() = workspace_owner_id);

CREATE POLICY "Agents can view own metrics"
ON public.agent_metrics FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "System can manage metrics"
ON public.agent_metrics FOR ALL
USING (
  auth.uid() = workspace_owner_id 
  OR auth.uid() = agent_id
);