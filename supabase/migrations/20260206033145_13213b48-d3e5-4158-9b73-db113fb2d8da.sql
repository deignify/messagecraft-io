-- 1. Add RLS policy for team members to view workspace WhatsApp numbers
CREATE POLICY "Team members can view workspace whatsapp numbers"
ON public.whatsapp_numbers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 2. Add RLS policy for team members to view workspace conversations
CREATE POLICY "Team members can view workspace conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 3. Add RLS policy for team members to view workspace messages
CREATE POLICY "Team members can view workspace messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 4. Add RLS policy for team members to send messages (INSERT)
CREATE POLICY "Team members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 5. Add RLS policy for team members to update messages
CREATE POLICY "Team members can update workspace messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 6. Add RLS policy for team members to view workspace contacts
CREATE POLICY "Team members can view workspace contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_team_member(auth.uid(), user_id)
);

-- 7. Restrict team member role updates to only admins/managers of the workspace
-- First drop existing policy that allows any update
DROP POLICY IF EXISTS "Workspace owners can manage team members" ON public.team_members;

-- Create more restrictive policies
CREATE POLICY "Workspace owners can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (auth.uid() = workspace_owner_id)
WITH CHECK (auth.uid() = workspace_owner_id);

-- Team members can only update their own availability (not role)
CREATE POLICY "Team members can update own availability"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND user_id != workspace_owner_id
)
WITH CHECK (
  user_id = auth.uid()
  AND user_id != workspace_owner_id
);