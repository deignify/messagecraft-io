
-- Allow team admins/managers to INSERT/UPDATE/DELETE contacts in their workspace
CREATE POLICY "Team admins can manage workspace contacts"
ON public.contacts
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team members to update workspace conversations (close, labels, etc.)
CREATE POLICY "Team members can update workspace conversations"
ON public.conversations
FOR UPDATE
USING (
  is_team_member(auth.uid(), user_id)
);

-- Allow team members to insert conversations (new message dialog)
CREATE POLICY "Team members can insert workspace conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  is_team_member(auth.uid(), user_id)
);

-- Allow team admins to manage templates (synced from Meta)
CREATE POLICY "Team admins can manage workspace templates"
ON public.templates
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage custom message templates
CREATE POLICY "Team admins can manage workspace message templates"
ON public.message_templates
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage automations
CREATE POLICY "Team admins can manage workspace automations"
ON public.automations
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage automation steps (via automation ownership)
CREATE POLICY "Team admins can manage workspace automation steps"
ON public.automation_steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM automations a
    WHERE a.id = automation_steps.automation_id
    AND get_team_role(auth.uid(), a.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM automations a
    WHERE a.id = automation_steps.automation_id
    AND get_team_role(auth.uid(), a.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage automation sessions
CREATE POLICY "Team admins can manage workspace automation sessions"
ON public.automation_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM automations a
    WHERE a.id = automation_sessions.automation_id
    AND get_team_role(auth.uid(), a.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage broadcast campaigns
CREATE POLICY "Team admins can manage workspace broadcasts"
ON public.broadcast_campaigns
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage broadcast recipients
CREATE POLICY "Team admins can manage workspace broadcast recipients"
ON public.broadcast_recipients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM broadcast_campaigns bc
    WHERE bc.id = broadcast_recipients.campaign_id
    AND get_team_role(auth.uid(), bc.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM broadcast_campaigns bc
    WHERE bc.id = broadcast_recipients.campaign_id
    AND get_team_role(auth.uid(), bc.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage quick replies for the workspace
CREATE POLICY "Team admins can view workspace quick replies"
ON public.quick_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.workspace_owner_id = quick_replies.user_id
  )
);

-- Allow team admins to manage CTWA campaigns
CREATE POLICY "Team admins can manage workspace ctwa campaigns"
ON public.ctwa_campaigns
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage hotel data
CREATE POLICY "Team admins can manage workspace hotels"
ON public.hotels
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);

-- Allow team admins to manage mobile shops
CREATE POLICY "Team admins can manage workspace mobile shops"
ON public.mobile_shops
FOR ALL
USING (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
)
WITH CHECK (
  get_team_role(auth.uid(), user_id) IN ('admin', 'manager')
);
