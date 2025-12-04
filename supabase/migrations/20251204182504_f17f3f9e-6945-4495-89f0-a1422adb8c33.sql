-- Drop existing restrictive DELETE policy
DROP POLICY IF EXISTS "Company and IFA admins can delete custom criteria" ON company_criteria;

-- Create new DELETE policy that allows IFA Admins to delete any criteria
-- and Company Admins to delete only custom criteria from their company
CREATE POLICY "Admins can delete company criteria" ON company_criteria
FOR DELETE USING (
  is_ifa_admin(auth.uid()) 
  OR (
    origin = 'custom' 
    AND company_id IN (
      SELECT (company_id)::uuid FROM user_companies WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'company_admin')
  )
);