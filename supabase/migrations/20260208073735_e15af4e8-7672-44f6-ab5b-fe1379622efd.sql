-- Drop and recreate to avoid conflicts
DROP POLICY IF EXISTS "Invited users can decline invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Invited users can accept invitations" ON public.team_invitations;

-- Invited users can delete/decline invitations sent to them
CREATE POLICY "Invited users can decline invitations"
ON public.team_invitations FOR DELETE
TO authenticated
USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- Invited users can update their invitation (to mark as accepted)  
CREATE POLICY "Invited users can accept invitations"
ON public.team_invitations FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);