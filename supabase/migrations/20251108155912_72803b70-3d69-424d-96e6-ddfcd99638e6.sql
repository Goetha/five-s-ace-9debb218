-- Criar função para vincular critérios a todos os ambientes da empresa
CREATE OR REPLACE FUNCTION public.link_criteria_to_all_environments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vincular todos os critérios do modelo a TODOS os ambientes da empresa
  INSERT INTO public.environment_criteria (environment_id, criterion_id)
  SELECT 
    e.id as environment_id,
    cc.id as criterion_id
  FROM public.environments e
  CROSS JOIN public.company_criteria cc
  WHERE e.company_id = NEW.company_id
    AND cc.company_id = NEW.company_id
    AND cc.origin_model_id = NEW.model_id
    AND e.status = 'active'
    AND cc.status = 'active'
  ON CONFLICT (environment_id, criterion_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserir modelo na empresa
CREATE TRIGGER link_criteria_after_model_copy
  AFTER INSERT ON public.company_models
  FOR EACH ROW
  EXECUTE FUNCTION public.link_criteria_to_all_environments();

-- Script de correção: vincular critérios existentes aos ambientes (para empresas que já têm modelos)
INSERT INTO public.environment_criteria (environment_id, criterion_id)
SELECT DISTINCT
  e.id as environment_id,
  cc.id as criterion_id
FROM public.environments e
CROSS JOIN public.company_criteria cc
WHERE e.company_id = cc.company_id
  AND e.status = 'active'
  AND cc.status = 'active'
ON CONFLICT (environment_id, criterion_id) DO NOTHING;