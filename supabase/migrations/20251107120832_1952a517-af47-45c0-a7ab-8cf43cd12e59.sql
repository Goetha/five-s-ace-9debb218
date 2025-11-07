-- Create audits table
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_yes INTEGER NOT NULL DEFAULT 0,
  total_no INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(5,2),
  score_level TEXT CHECK (score_level IN ('low', 'medium', 'high')),
  next_audit_date DATE,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_items table
CREATE TABLE public.audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.company_criteria(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer BOOLEAN,
  photo_url TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create storage bucket for audit photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audit-photos', 'audit-photos', false);

-- Enable RLS on audits table
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_items table
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audits table
-- IFA admins can view all audits
CREATE POLICY "IFA admins can view all audits"
ON public.audits
FOR SELECT
USING (is_ifa_admin(auth.uid()));

-- Company users can view audits from their linked companies
CREATE POLICY "Company users can view their company audits"
ON public.audits
FOR SELECT
USING (company_id IN (
  SELECT (user_companies.company_id)::uuid
  FROM public.user_companies
  WHERE user_companies.user_id = auth.uid()
));

-- Auditors can create audits in their linked companies
CREATE POLICY "Auditors can create audits"
ON public.audits
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT (user_companies.company_id)::uuid
    FROM public.user_companies
    WHERE user_companies.user_id = auth.uid()
  )
  AND auth.uid() = auditor_id
);

-- Auditors can update their own audits
CREATE POLICY "Auditors can update their own audits"
ON public.audits
FOR UPDATE
USING (auth.uid() = auditor_id);

-- RLS Policies for audit_items table
-- Users can view items from audits they have access to
CREATE POLICY "Users can view audit items from their company audits"
ON public.audit_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.audits
    WHERE audits.id = audit_items.audit_id
    AND (
      audits.company_id IN (
        SELECT (user_companies.company_id)::uuid
        FROM public.user_companies
        WHERE user_companies.user_id = auth.uid()
      )
      OR is_ifa_admin(auth.uid())
    )
  )
);

-- Auditors can create audit items for their audits
CREATE POLICY "Auditors can create audit items"
ON public.audit_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.audits
    WHERE audits.id = audit_items.audit_id
    AND audits.auditor_id = auth.uid()
  )
);

-- Auditors can update audit items for their audits
CREATE POLICY "Auditors can update audit items"
ON public.audit_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.audits
    WHERE audits.id = audit_items.audit_id
    AND audits.auditor_id = auth.uid()
  )
);

-- Storage policies for audit photos
-- Users can view photos from audits they have access to
CREATE POLICY "Users can view audit photos from their company"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-photos'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
    OR is_ifa_admin(auth.uid())
  )
);

-- Auditors can upload photos to their audits
CREATE POLICY "Auditors can upload audit photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audit-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM public.user_companies
    WHERE user_id = auth.uid()
  )
);

-- Create trigger to update updated_at on audits
CREATE TRIGGER update_audits_updated_at
BEFORE UPDATE ON public.audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_audits_company_id ON public.audits(company_id);
CREATE INDEX idx_audits_location_id ON public.audits(location_id);
CREATE INDEX idx_audits_auditor_id ON public.audits(auditor_id);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audit_items_audit_id ON public.audit_items(audit_id);
CREATE INDEX idx_audit_items_criterion_id ON public.audit_items(criterion_id);