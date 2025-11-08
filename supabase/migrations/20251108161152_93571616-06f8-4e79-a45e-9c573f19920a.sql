-- 1) Garantir que ao vincular um modelo à empresa, os critérios são copiados
-- Criar trigger para copiar critérios do modelo (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'copy_criteria_on_model_link'
  ) THEN
    CREATE TRIGGER copy_criteria_on_model_link
      AFTER INSERT ON public.company_models
      FOR EACH ROW
      EXECUTE FUNCTION public.copy_model_criteria_to_company();
  END IF;
END$$;

-- 2) Reforçar a função que também faz a cópia antes de vincular aos ambientes
CREATE OR REPLACE FUNCTION public.link_criteria_to_all_environments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Primeiro, garantir que os critérios do modelo existam em company_criteria
  INSERT INTO public.company_criteria (
    company_id,
    master_criterion_id,
    name,
    description,
    senso,
    scoring_type,
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

  -- Em seguida, vincular todos os critérios do modelo a TODOS os ambientes ativos da empresa
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

-- 3) Garantir que exista o trigger para chamar a função acima após vincular modelo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'link_criteria_after_model_copy'
  ) THEN
    CREATE TRIGGER link_criteria_after_model_copy
      AFTER INSERT ON public.company_models
      FOR EACH ROW
      EXECUTE FUNCTION public.link_criteria_to_all_environments();
  END IF;
END$$;

-- 4) Correção retroativa: copiar critérios e vincular a ambientes para vínculos existentes
-- Copiar critérios faltantes
INSERT INTO public.company_criteria (
  company_id,
  master_criterion_id,
  name,
  description,
  senso,
  scoring_type,
  origin,
  origin_model_id,
  origin_model_name,
  status,
  tags
)
SELECT
  cm.company_id,
  mc.id,
  mc.name,
  mc.description,
  mc.senso,
  mc.scoring_type,
  'ifa',
  cm.model_id,
  mm.name,
  mc.status,
  mc.tags
FROM public.company_models cm
JOIN public.master_model_criteria mmc ON mmc.model_id = cm.model_id
JOIN public.master_criteria mc ON mc.id = mmc.criterion_id
JOIN public.master_models mm ON mm.id = cm.model_id
ON CONFLICT (company_id, master_criterion_id) DO NOTHING;

-- Vincular aos ambientes ativos
INSERT INTO public.environment_criteria (environment_id, criterion_id)
SELECT DISTINCT
  e.id as environment_id,
  cc.id as criterion_id
FROM public.environments e
JOIN public.company_criteria cc ON cc.company_id = e.company_id
WHERE e.status = 'active'
  AND cc.status = 'active'
ON CONFLICT (environment_id, criterion_id) DO NOTHING;