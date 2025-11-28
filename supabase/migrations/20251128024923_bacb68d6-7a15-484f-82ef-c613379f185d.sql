-- Remover trigger e função que vincula automaticamente todos os critérios aos ambientes
-- Isso estava sobrescrevendo as seleções manuais de critérios por local

-- Primeiro dropar o trigger
DROP TRIGGER IF EXISTS trg_after_environments_insert ON public.environments;

-- Depois dropar a função
DROP FUNCTION IF EXISTS public.tg_after_environments_insert();