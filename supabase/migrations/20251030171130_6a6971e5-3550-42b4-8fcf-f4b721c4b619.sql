-- Tabela de Critérios Mestre (criados pelo IFA Admin)
CREATE TABLE IF NOT EXISTS public.master_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  senso TEXT NOT NULL CHECK (senso IN ('1S', '2S', '3S', '4S', '5S')),
  scoring_type TEXT NOT NULL CHECK (scoring_type IN ('0-10', 'conform-non-conform', '0-5', 'percentage')),
  default_weight INTEGER NOT NULL CHECK (default_weight >= 1 AND default_weight <= 10),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Modelos Mestre (criados pelo IFA Admin)
CREATE TABLE IF NOT EXISTS public.master_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de relacionamento entre Modelos e Critérios
CREATE TABLE IF NOT EXISTS public.master_model_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.master_models(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.master_criteria(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_id, criterion_id)
);

-- Tabela de vínculo entre Empresas e Modelos
CREATE TABLE IF NOT EXISTS public.company_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.master_models(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notify_admin BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, model_id)
);

-- Habilitar RLS
ALTER TABLE public.master_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_model_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_models ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para master_criteria
CREATE POLICY "IFA admins can manage master criteria"
  ON public.master_criteria
  FOR ALL
  USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Companies can view active master criteria"
  ON public.master_criteria
  FOR SELECT
  USING (status = 'active');

-- Políticas RLS para master_models
CREATE POLICY "IFA admins can manage master models"
  ON public.master_models
  FOR ALL
  USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Companies can view active master models"
  ON public.master_models
  FOR SELECT
  USING (status = 'active');

-- Políticas RLS para master_model_criteria
CREATE POLICY "IFA admins can manage model criteria links"
  ON public.master_model_criteria
  FOR ALL
  USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Companies can view model criteria links"
  ON public.master_model_criteria
  FOR SELECT
  USING (true);

-- Políticas RLS para company_models
CREATE POLICY "IFA admins can manage company models"
  ON public.company_models
  FOR ALL
  USING (is_ifa_admin(auth.uid()));

CREATE POLICY "Companies can view their own models"
  ON public.company_models
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- Índices para performance
CREATE INDEX idx_master_criteria_status ON public.master_criteria(status);
CREATE INDEX idx_master_criteria_senso ON public.master_criteria(senso);
CREATE INDEX idx_master_models_status ON public.master_models(status);
CREATE INDEX idx_master_model_criteria_model ON public.master_model_criteria(model_id);
CREATE INDEX idx_master_model_criteria_criterion ON public.master_model_criteria(criterion_id);
CREATE INDEX idx_company_models_company ON public.company_models(company_id);
CREATE INDEX idx_company_models_model ON public.company_models(model_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_master_criteria_updated_at
  BEFORE UPDATE ON public.master_criteria
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_models_updated_at
  BEFORE UPDATE ON public.master_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para copiar critérios do modelo para a empresa quando vinculado
CREATE OR REPLACE FUNCTION public.copy_model_criteria_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir critérios do modelo na tabela company_criteria
  INSERT INTO public.company_criteria (
    company_id,
    master_criterion_id,
    name,
    description,
    senso,
    scoring_type,
    default_weight,
    custom_weight,
    origin,
    origin_model_id,
    origin_model_name,
    status,
    tags
  )
  SELECT
    NEW.company_id,
    mc.id,
    mc.name,
    mc.description,
    mc.senso,
    mc.scoring_type,
    mc.default_weight,
    mc.default_weight, -- custom_weight inicia igual ao default
    'ifa',
    NEW.model_id,
    mm.name,
    mc.status,
    mc.tags
  FROM public.master_model_criteria mmc
  JOIN public.master_criteria mc ON mc.id = mmc.criterion_id
  JOIN public.master_models mm ON mm.id = mmc.model_id
  WHERE mmc.model_id = NEW.model_id
  ON CONFLICT (company_id, master_criterion_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para copiar critérios automaticamente quando modelo é vinculado
CREATE TRIGGER copy_criteria_on_model_link
  AFTER INSERT ON public.company_models
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_model_criteria_to_company();