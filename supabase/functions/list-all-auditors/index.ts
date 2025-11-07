import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedCompany {
  id: string;
  name: string;
}

interface Auditor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  linked_companies: LinkedCompany[];
  environments_count: number;
  created_at: string;
  last_access: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with service role key
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

    // Check if user is ifa_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ifa_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Only IFA Admins can access this resource');
    }

    // Fetch all users with 'auditor' role
    // This ensures only auditors appear in the list
    const { data: auditors, error: auditorsError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        created_at
      `)
      .eq('role', 'auditor');

    if (auditorsError) throw auditorsError;

    // Build result array
    const result: Auditor[] = [];

    for (const auditor of auditors || []) {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', auditor.user_id)
        .single();

      // Get email from auth.users
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(auditor.user_id);

      // Get linked companies
      const { data: companyLinks } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', auditor.user_id);

      const linkedCompanies: LinkedCompany[] = [];
      
      if (companyLinks && companyLinks.length > 0) {
        const companyIds = companyLinks.map(link => link.company_id);
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        if (companies) {
          linkedCompanies.push(...companies.map(c => ({ id: c.id, name: c.name })));
        }
      }

      // Get environments count
      const { count: environmentsCount } = await supabase
        .from('user_environments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auditor.user_id);

      result.push({
        id: auditor.user_id,
        name: profile?.full_name || authUser?.email || 'Unknown',
        email: authUser?.email || '',
        phone: profile?.phone || null,
        status: 'active', // You can add logic to determine status
        linked_companies: linkedCompanies,
        environments_count: environmentsCount || 0,
        created_at: auditor.created_at,
        last_access: authUser?.last_sign_in_at || null,
      });
    }

    return new Response(
      JSON.stringify({ auditors: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error listing auditors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
