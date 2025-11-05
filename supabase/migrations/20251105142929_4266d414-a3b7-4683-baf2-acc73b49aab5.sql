-- Remove colunas de peso das tabelas
-- Primeiro, atualizar a função que usa essas colunas
CREATE OR REPLACE FUNCTION public.copy_model_criteria_to_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir critérios do modelo na tabela company_criteria
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
  
  RETURN NEW;
END;
$function$;

-- Remover coluna default_weight da tabela master_criteria
ALTER TABLE public.master_criteria 
DROP COLUMN IF EXISTS default_weight;

-- Remover colunas default_weight e custom_weight da tabela company_criteria
ALTER TABLE public.company_criteria 
DROP COLUMN IF EXISTS default_weight,
DROP COLUMN IF EXISTS custom_weight;