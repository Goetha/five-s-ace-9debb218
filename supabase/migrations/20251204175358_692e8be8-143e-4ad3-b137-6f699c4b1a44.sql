-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Company admins can create custom criteria in their linked compa" ON company_criteria;

-- Criar nova política de INSERT que inclui IFA Admin
CREATE POLICY "Company and IFA admins can create custom criteria"
ON company_criteria
FOR INSERT
WITH CHECK (
  origin = 'custom' AND (
    -- IFA Admin pode criar para qualquer empresa
    is_ifa_admin(auth.uid())
    OR
    -- Company Admin pode criar para suas empresas vinculadas
    (
      company_id IN (
        SELECT company_id::uuid FROM user_companies WHERE user_id = auth.uid()
      )
      AND has_role(auth.uid(), 'company_admin')
    )
  )
);

-- Remover política antiga de DELETE
DROP POLICY IF EXISTS "Company admins can delete custom criteria from their linked com" ON company_criteria;

-- Criar nova política de DELETE que inclui IFA Admin
CREATE POLICY "Company and IFA admins can delete custom criteria"
ON company_criteria
FOR DELETE
USING (
  origin = 'custom' AND (
    is_ifa_admin(auth.uid())
    OR
    (
      company_id IN (
        SELECT company_id::uuid FROM user_companies WHERE user_id = auth.uid()
      )
      AND has_role(auth.uid(), 'company_admin')
    )
  )
);