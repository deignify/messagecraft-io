-- Add RLS policy for team members to view teammate profiles
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = profiles.id
    AND (
      tm.workspace_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.team_members my_membership
        WHERE my_membership.user_id = auth.uid()
        AND my_membership.workspace_owner_id = tm.workspace_owner_id
      )
    )
  )
);

-- Add RLS policy for workspace owners to see profiles of their team members
CREATE POLICY "Workspace owners can view team member profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT tm.user_id FROM public.team_members tm
    WHERE tm.workspace_owner_id = auth.uid()
  )
);