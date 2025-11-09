-- RLS adjustments to allow IFA admins proper visibility and management
-- 1) company_criteria: allow IFA admin to SELECT
DROP POLICY IF EXISTS "Users can view criteria from their linked companies" ON public.company_criteria;

CREATE POLICY "Users and IFA can view company criteria"
ON public.company_criteria
FOR SELECT
USING (
  is_ifa_admin(auth.uid()) OR
  company_id IN (
    SELECT (uc.company_id)::uuid
    FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
  )
);

-- 2) environment_criteria: allow IFA admin to manage (ALL) and company users as before
DROP POLICY IF EXISTS "Company users can manage their environment criteria" ON public.environment_criteria;

CREATE POLICY "Company users and IFA can manage environment criteria"
ON public.environment_criteria
FOR ALL
USING (
  is_ifa_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_criteria.environment_id
      AND e.company_id IN (
        SELECT (uc.company_id)::uuid
        FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
      )
  )
)
WITH CHECK (
  is_ifa_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_criteria.environment_id
      AND e.company_id IN (
        SELECT (uc.company_id)::uuid
        FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
      )
  )
);
