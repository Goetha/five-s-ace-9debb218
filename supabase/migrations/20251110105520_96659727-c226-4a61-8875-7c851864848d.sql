-- Clean all database data preserving only IFA admin user
-- User: institutofernandoantonio@gmail.com (37aa1a0d-7113-4f6e-9023-afbd7a59eb77)

-- 1. Clean audit data (most dependent)
DELETE FROM public.audit_items;
DELETE FROM public.audits;

-- 2. Clean environment and company criteria links
DELETE FROM public.environment_criteria;
DELETE FROM public.company_criteria;

-- 3. Clean environments
DELETE FROM public.environments;

-- 4. Clean user links (preserve IFA admin)
DELETE FROM public.user_environments 
WHERE user_id != '37aa1a0d-7113-4f6e-9023-afbd7a59eb77';

DELETE FROM public.user_companies 
WHERE user_id != '37aa1a0d-7113-4f6e-9023-afbd7a59eb77';

DELETE FROM public.user_roles 
WHERE user_id != '37aa1a0d-7113-4f6e-9023-afbd7a59eb77';

-- 5. Clean companies
DELETE FROM public.company_models;
DELETE FROM public.companies;

-- 6. Clean master models and criteria
DELETE FROM public.master_model_criteria;
DELETE FROM public.master_models;
DELETE FROM public.master_criteria;

-- 7. Clean profiles (preserve IFA admin)
DELETE FROM public.profiles 
WHERE id != '37aa1a0d-7113-4f6e-9023-afbd7a59eb77';