-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Users can create own templates" ON public.message_templates;

-- Create proper permissive INSERT policy
CREATE POLICY "Users can create own templates" 
ON public.message_templates 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure UPDATE and DELETE are permissive
DROP POLICY IF EXISTS "Users can update own templates" ON public.message_templates;
CREATE POLICY "Users can update own templates" 
ON public.message_templates 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON public.message_templates;
CREATE POLICY "Users can delete own templates" 
ON public.message_templates 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);