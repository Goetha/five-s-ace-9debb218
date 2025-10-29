-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environments table
CREATE TABLE IF NOT EXISTS public.environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  responsible_user_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_environments junction table for auditors
CREATE TABLE IF NOT EXISTS public.user_environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, environment_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_environments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company ID as UUID
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id::uuid
  FROM public.user_companies
  WHERE user_companies.user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for companies
CREATE POLICY "IFA admins can manage all companies"
ON public.companies
FOR ALL
USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Company admins can view their company"
ON public.companies
FOR SELECT
USING (id = get_user_company_id(auth.uid()));

-- RLS Policies for environments
CREATE POLICY "IFA admins can view all environments"
ON public.environments
FOR SELECT
USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Company users can manage their company environments"
ON public.environments
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for user_environments
CREATE POLICY "Company admins can manage user environment links"
ON public.user_environments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = user_environments.environment_id
    AND e.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Users can view their own environment links"
ON public.user_environments
FOR SELECT
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_environments_company_id ON public.environments(company_id);
CREATE INDEX IF NOT EXISTS idx_environments_parent_id ON public.environments(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_environments_user_id ON public.user_environments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_environments_environment_id ON public.user_environments(environment_id);