-- Create a trigger to prevent non-owners from changing their own role
CREATE OR REPLACE FUNCTION public.protect_team_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the role is being changed, only allow the workspace owner to do it
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() != OLD.workspace_owner_id THEN
      RAISE EXCEPTION 'Only the workspace owner can change team member roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_role_changes
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.protect_team_member_role();