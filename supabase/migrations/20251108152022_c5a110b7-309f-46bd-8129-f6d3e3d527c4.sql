-- Add INSERT, UPDATE, DELETE policies for IFA admins on environments table
-- IFA admins should be able to create, update and delete environments for any company

CREATE POLICY "IFA admins can create environments for any company"
ON public.environments
FOR INSERT
TO authenticated
WITH CHECK (is_ifa_admin(auth.uid()));

CREATE POLICY "IFA admins can update any environment"
ON public.environments
FOR UPDATE
TO authenticated
USING (is_ifa_admin(auth.uid()));

CREATE POLICY "IFA admins can delete any environment"
ON public.environments
FOR DELETE
TO authenticated
USING (is_ifa_admin(auth.uid()));