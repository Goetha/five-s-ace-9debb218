-- Adicionar constraint UNIQUE para evitar duplicatas
ALTER TABLE public.company_criteria 
ADD CONSTRAINT company_criteria_company_master_unique 
UNIQUE (company_id, master_criterion_id);