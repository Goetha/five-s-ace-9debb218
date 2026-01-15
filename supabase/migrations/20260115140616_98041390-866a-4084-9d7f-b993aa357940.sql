-- Drop the existing check constraint and recreate with 'master' included
ALTER TABLE public.company_criteria 
DROP CONSTRAINT IF EXISTS company_criteria_origin_check;

ALTER TABLE public.company_criteria 
ADD CONSTRAINT company_criteria_origin_check 
CHECK (origin = ANY (ARRAY['ifa'::text, 'custom'::text, 'master'::text]));