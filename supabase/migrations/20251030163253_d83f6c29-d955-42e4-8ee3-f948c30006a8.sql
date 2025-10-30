-- Criar tabela de critérios da empresa
CREATE TABLE IF NOT EXISTS public.company_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  master_criterion_id UUID, -- referência ao critério mestre (se herdado do IFA), NULL se personalizado
  name TEXT NOT NULL,
  description TEXT,
  senso TEXT NOT NULL CHECK (senso IN ('1S', '2S', '3S', '4S', '5S')),
  scoring_type TEXT NOT NULL CHECK (scoring_type IN ('0-10', 'conform-non-conform', '0-5', 'percentage')),
  default_weight INTEGER NOT NULL CHECK (default_weight >= 1 AND default_weight <= 10),
  custom_weight INTEGER NOT NULL CHECK (custom_weight >= 1 AND custom_weight <= 10),
  origin TEXT NOT NULL CHECK (origin IN ('ifa', 'custom')),
  origin_model_id UUID, -- ID do modelo mestre de onde veio (se origin='ifa')
  origin_model_name TEXT, -- Nome do modelo mestre
  tags TEXT[], -- Tags/categorias
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID, -- usuário que criou (para critérios personalizados)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.company_criteria ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários só veem critérios da própria empresa
CREATE POLICY "Users can view criteria from their company"
ON public.company_criteria
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
);

-- Políticas para inserir (apenas admin da empresa pode criar critérios personalizados)
CREATE POLICY "Company admins can create custom criteria"
ON public.company_criteria
FOR INSERT
WITH CHECK (
  origin = 'custom' AND
  company_id = get_user_company_id(auth.uid()) AND
  has_role(auth.uid(), 'company_admin')
);

-- Políticas para atualizar (apenas admin da empresa)
CREATE POLICY "Company admins can update criteria"
ON public.company_criteria
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) AND
  has_role(auth.uid(), 'company_admin')
);

-- Políticas para excluir (apenas critérios personalizados, apenas admin)
CREATE POLICY "Company admins can delete custom criteria"
ON public.company_criteria
FOR DELETE
USING (
  origin = 'custom' AND
  company_id = get_user_company_id(auth.uid()) AND
  has_role(auth.uid(), 'company_admin')
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_company_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_criteria_updated_at
BEFORE UPDATE ON public.company_criteria
FOR EACH ROW
EXECUTE FUNCTION public.update_company_criteria_updated_at();

-- Índices para performance
CREATE INDEX idx_company_criteria_company_id ON public.company_criteria(company_id);
CREATE INDEX idx_company_criteria_origin ON public.company_criteria(origin);
CREATE INDEX idx_company_criteria_status ON public.company_criteria(status);
CREATE INDEX idx_company_criteria_senso ON public.company_criteria(senso);