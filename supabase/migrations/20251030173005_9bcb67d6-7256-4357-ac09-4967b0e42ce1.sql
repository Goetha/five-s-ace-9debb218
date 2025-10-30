-- Tabela para relacionar Ambientes com Critérios
CREATE TABLE IF NOT EXISTS public.environment_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.company_criteria(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(environment_id, criterion_id)
);

-- Habilitar RLS
ALTER TABLE public.environment_criteria ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Company users can manage their environment criteria"
  ON public.environment_criteria
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.environments e
      WHERE e.id = environment_criteria.environment_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

-- Índices para performance
CREATE INDEX idx_environment_criteria_environment ON public.environment_criteria(environment_id);
CREATE INDEX idx_environment_criteria_criterion ON public.environment_criteria(criterion_id);