import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  auditor_id: string;
  company_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify caller is ifa_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ifa_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Only IFA Admins can update auditor companies');
    }

    // Parse request body
    const requestData: UpdateRequest = await req.json();
    const { auditor_id, company_ids } = requestData;

    // Validate input
    if (!auditor_id || !company_ids || company_ids.length === 0) {
      throw new Error('auditor_id and at least one company_id are required');
    }

    // Verify the user is actually an auditor
    const { data: auditorRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', auditor_id)
      .eq('role', 'auditor')
      .maybeSingle();

    if (!auditorRole) {
      throw new Error('User is not an auditor');
    }

    // Delete existing company links
    const { error: deleteError } = await supabase
      .from('user_companies')
      .delete()
      .eq('user_id', auditor_id);

    if (deleteError) throw deleteError;

    // Insert new company links
    const insertData = company_ids.map(companyId => ({
      user_id: auditor_id,
      company_id: companyId,
    }));

    const { error: insertError } = await supabase
      .from('user_companies')
      .insert(insertData);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Auditor companies updated successfully',
        auditor_id,
        company_ids
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating auditor companies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
