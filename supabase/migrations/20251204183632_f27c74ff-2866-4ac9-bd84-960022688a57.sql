-- Create audit_cycles table
CREATE TABLE public.audit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  total_locations INTEGER NOT NULL DEFAULT 0,
  completed_locations INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add cycle_id to audits table
ALTER TABLE public.audits ADD COLUMN cycle_id UUID REFERENCES audit_cycles(id);

-- Enable RLS
ALTER TABLE public.audit_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_cycles
CREATE POLICY "IFA admins can view all cycles"
ON public.audit_cycles FOR SELECT
USING (is_ifa_admin(auth.uid()));

CREATE POLICY "IFA admins can manage all cycles"
ON public.audit_cycles FOR ALL
USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Company users can view their company cycles"
ON public.audit_cycles FOR SELECT
USING (company_id IN (
  SELECT (company_id)::uuid FROM user_companies WHERE user_id = auth.uid()
));

CREATE POLICY "Auditors can create cycles for their companies"
ON public.audit_cycles FOR INSERT
WITH CHECK (
  company_id IN (SELECT (company_id)::uuid FROM user_companies WHERE user_id = auth.uid())
  AND auditor_id = auth.uid()
);

CREATE POLICY "Auditors can update their own cycles"
ON public.audit_cycles FOR UPDATE
USING (auditor_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_audit_cycles_updated_at
BEFORE UPDATE ON public.audit_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();