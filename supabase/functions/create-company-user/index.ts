import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role: string;
  linkedEnvironments: string[];
  status: 'active' | 'inactive';
  password: string;
  companyId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const requestData: CreateUserRequest = await req.json();
    
    console.log("Creating user:", requestData.email);

    // Validate required fields
    if (!requestData.email || !requestData.name || !requestData.password) {
      throw new Error("email, name e password são obrigatórios");
    }

    // Check if user already exists (fallback using listUsers)
    const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers();

    if (listErr) {
      console.error("Error checking existing users:", listErr);
    }

    // If user exists in the current page, link to company and assign role instead of failing
    const existingUser = usersPage?.users?.find((u) => (u.email || '').toLowerCase() === requestData.email.toLowerCase());

    if (existingUser) {
      const existingUserId = existingUser.id;
      console.log("User already exists with email:", requestData.email, "- linking to company and ensuring role");

      // Ensure role exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUserId)
        .eq('role', requestData.role)
        .maybeSingle();

      if (!existingRole) {
        const { error: insertRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: existingUserId, role: requestData.role });
        if (insertRoleError) {
          console.error('Error inserting role for existing user:', insertRoleError);
        }
      }

      // Ensure company link exists (only if companyId provided)
      if (requestData.companyId) {
        const { data: existingCompanyLink } = await supabaseAdmin
          .from('user_companies')
          .select('id')
          .eq('user_id', existingUserId)
          .eq('company_id', requestData.companyId)
          .maybeSingle();

        if (!existingCompanyLink) {
          const { error: insertCompanyError } = await supabaseAdmin
            .from('user_companies')
            .insert({ user_id: existingUserId, company_id: requestData.companyId });
          if (insertCompanyError) {
            console.error('Error linking existing user to company:', insertCompanyError);
          }
        }
      }

      // Link environments if provided and role is auditor
      if (requestData.role === 'auditor' && requestData.linkedEnvironments?.length) {
        for (const envId of requestData.linkedEnvironments) {
          const { data: existsEnvLink } = await supabaseAdmin
            .from('user_environments')
            .select('id')
            .eq('user_id', existingUserId)
            .eq('environment_id', envId)
            .maybeSingle();

          if (!existsEnvLink) {
            const { error: insertEnvError } = await supabaseAdmin
              .from('user_environments')
              .insert({ user_id: existingUserId, environment_id: envId });
            if (insertEnvError) {
              console.error('Error linking environment for existing user:', insertEnvError);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          userId: existingUserId,
          linkedExisting: true,
          created: false,
          message: 'Usuário já existente vinculado à empresa com sucesso',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.name,
        phone: requestData.phone,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      // Provide user-friendly error messages
      if (authError.message?.includes('already been registered')) {
        throw new Error(`O email ${requestData.email} já está cadastrado no sistema.`);
      }
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Usuário não foi criado");
    }

    console.log("User created in auth, ID:", authData.user.id);

    // 2. Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: requestData.name,
        phone: requestData.phone || null,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // 3. Assign role to user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: requestData.role,
      });

    if (roleError) {
      console.error("Role error:", roleError);
      throw new Error(`Erro ao atribuir role: ${roleError.message}`);
    }

    // 4. Link user to company (if provided)
    if (requestData.companyId) {
      const { error: companyError } = await supabaseAdmin
        .from('user_companies')
        .insert({
          user_id: authData.user.id,
          company_id: requestData.companyId,
        });

      if (companyError) {
        console.error("Company link error:", companyError);
        throw new Error(`Erro ao vincular à empresa: ${companyError.message}`);
      }
    }

    // 5. Link auditor to environments (if applicable)
    if (requestData.role === 'auditor' && requestData.linkedEnvironments.length > 0) {
      const environmentLinks = requestData.linkedEnvironments.map(envId => ({
        user_id: authData.user.id,
        environment_id: envId,
      }));

      const { error: envError } = await supabaseAdmin
        .from('user_environments')
        .insert(environmentLinks);

      if (envError) {
        console.error("Environment link error:", envError);
      }
    }

    console.log("User created successfully:", authData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        message: "Usuário criado com sucesso"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-company-user function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Erro ao criar usuário"
      }),
      {
        status: 400,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});
