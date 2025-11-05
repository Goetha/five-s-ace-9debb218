-- Passo 1: Criar nova coluna sensos como array
ALTER TABLE public.master_criteria
ADD COLUMN IF NOT EXISTS sensos text[];

ALTER TABLE public.company_criteria
ADD COLUMN IF NOT EXISTS sensos text[];

-- Passo 2: Migrar dados existentes para a nova coluna
UPDATE public.master_criteria
SET sensos = ARRAY[senso]
WHERE sensos IS NULL;

UPDATE public.company_criteria
SET sensos = ARRAY[senso]
WHERE sensos IS NULL;

-- Passo 3: Remover coluna antiga e renomear
ALTER TABLE public.master_criteria
DROP COLUMN senso;

ALTER TABLE public.master_criteria
RENAME COLUMN sensos TO senso;

ALTER TABLE public.company_criteria
DROP COLUMN senso;

ALTER TABLE public.company_criteria
RENAME COLUMN sensos TO senso;

-- Passo 4: Adicionar constraint para garantir que senso não seja vazio
ALTER TABLE public.master_criteria
ADD CONSTRAINT senso_not_empty CHECK (array_length(senso, 1) > 0);

ALTER TABLE public.company_criteria
ADD CONSTRAINT senso_not_empty CHECK (array_length(senso, 1) > 0);