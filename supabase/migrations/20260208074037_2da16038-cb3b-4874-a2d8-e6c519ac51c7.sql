-- Allow invited users to insert themselves as team members when they have a valid invitation
CREATE POLICY "Invited users can join via invitation"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE workspace_owner_id = team_members.workspace_owner_id
      AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND accepted_at IS NULL
      AND expires_at > now()
  )
);