-- Fix RLS policies for multi-company auditors

-- 1. Update environments policy to allow access to all linked companies
DROP POLICY IF EXISTS "Company users can manage their company environments" ON environments;

CREATE POLICY "Company users can manage their linked company environments"
ON environments
FOR ALL
USING (
  company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
);

-- 2. Update company_criteria policy to allow access to all linked companies
DROP POLICY IF EXISTS "Users can view criteria from their company" ON company_criteria;

CREATE POLICY "Users can view criteria from their linked companies"
ON company_criteria
FOR SELECT
USING (
  company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
);

-- 3. Update company_criteria management policies for company_admin
DROP POLICY IF EXISTS "Company admins can create custom criteria" ON company_criteria;
DROP POLICY IF EXISTS "Company admins can delete custom criteria" ON company_criteria;
DROP POLICY IF EXISTS "Company admins can update criteria" ON company_criteria;

CREATE POLICY "Company admins can create custom criteria in their linked companies"
ON company_criteria
FOR INSERT
WITH CHECK (
  origin = 'custom' 
  AND company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Company admins can delete custom criteria from their linked companies"
ON company_criteria
FOR DELETE
USING (
  origin = 'custom' 
  AND company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Company admins can update criteria in their linked companies"
ON company_criteria
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'company_admin')
);

-- 4. Update companies view policy for company_admin
DROP POLICY IF EXISTS "Company admins can view their company" ON companies;

CREATE POLICY "Company admins can view their linked companies"
ON companies
FOR SELECT
USING (
  id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
);

-- 5. Update company_models policy
DROP POLICY IF EXISTS "Companies can view their own models" ON company_models;

CREATE POLICY "Companies can view models from their linked companies"
ON company_models
FOR SELECT
USING (
  company_id IN (
    SELECT company_id::uuid 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
);