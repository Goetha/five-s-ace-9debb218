-- Drop existing INSERT policy and create a new one that allows both 'custom' and 'master' origins
DROP POLICY IF EXISTS "Company and IFA admins can create custom criteria" ON public.company_criteria;

CREATE POLICY "Company and IFA admins can create criteria"
ON public.company_criteria
FOR INSERT
WITH CHECK (
  -- Allow 'custom' or 'master' origin
  (origin IN ('custom', 'master'))
  AND (
    -- IFA admins can create for any company
    is_ifa_admin(auth.uid())
    OR
    -- Company admins can create for their own companies
    (
      company_id IN (
        SELECT company_id::uuid FROM user_companies WHERE user_id = auth.uid()
      )
      AND has_role(auth.uid(), 'company_admin'::app_role)
    )
  )
);