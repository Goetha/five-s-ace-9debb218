import { supabase } from '@/integrations/supabase/client';

interface CompanyModel {
  id: string;
  name: string;
}

/**
 * Busca ou cria automaticamente um modelo mestre para uma empresa.
 * O modelo terá o mesmo nome da empresa.
 */
export async function getOrCreateCompanyModel(companyId: string): Promise<CompanyModel | null> {
  try {
    // 1. Buscar empresa pelo ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Error fetching company:', companyError);
      return null;
    }

    // 2. Verificar se já existe modelo com o nome da empresa
    const { data: existingModel, error: modelError } = await supabase
      .from('master_models')
      .select('id, name')
      .eq('name', company.name)
      .maybeSingle();

    if (modelError) {
      console.error('Error checking existing model:', modelError);
      return null;
    }

    if (existingModel) {
      // 3a. Se existe, garantir que há vínculo na company_models
      const { error: upsertError } = await supabase
        .from('company_models')
        .upsert(
          { 
            company_id: companyId, 
            model_id: existingModel.id, 
            status: 'active' 
          },
          { 
            onConflict: 'company_id,model_id',
            ignoreDuplicates: true 
          }
        );

      if (upsertError) {
        // Se o upsert falhar, pode ser que já existe - vamos apenas retornar o modelo
        console.warn('Upsert warning (may already exist):', upsertError);
      }

      return existingModel;
    }

    // 3b. Se não existe, criar modelo com nome da empresa
    const { data: newModel, error: createError } = await supabase
      .from('master_models')
      .insert({ 
        name: company.name, 
        description: `Modelo 5S - ${company.name}`, 
        status: 'active' 
      })
      .select('id, name')
      .single();

    if (createError || !newModel) {
      console.error('Error creating model:', createError);
      return null;
    }

    // 4. Vincular modelo à empresa
    const { error: linkError } = await supabase
      .from('company_models')
      .insert({ 
        company_id: companyId, 
        model_id: newModel.id, 
        status: 'active' 
      });

    if (linkError) {
      console.error('Error linking model to company:', linkError);
      // Modelo foi criado, retornamos mesmo assim
    }

    return newModel;
  } catch (error) {
    console.error('Error in getOrCreateCompanyModel:', error);
    return null;
  }
}
