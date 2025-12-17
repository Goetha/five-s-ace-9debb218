-- Add UPDATE policy for IFA admins on company_criteria
CREATE POLICY "IFA admins can update any company criteria"
ON public.company_criteria
FOR UPDATE
USING (is_ifa_admin(auth.uid()))
WITH CHECK (is_ifa_admin(auth.uid()));