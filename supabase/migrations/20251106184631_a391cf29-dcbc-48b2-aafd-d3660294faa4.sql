-- Função que cria ambiente principal automaticamente quando uma empresa é criada
CREATE OR REPLACE FUNCTION public.create_main_environment_for_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir ambiente principal para a empresa recém-criada
  INSERT INTO public.environments (
    company_id,
    name,
    parent_id,
    status,
    description
  ) VALUES (
    NEW.id,
    NEW.name,
    NULL,
    'active',
    'Ambiente principal da ' || NEW.name
  );
  
  RETURN NEW;
END;
$$;

-- Criar o trigger na tabela companies
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_main_environment_for_company();