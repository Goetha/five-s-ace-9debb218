import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyUser {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  status: 'active' | 'inactive';
  linked_environments: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Client bound to the caller JWT (for auth context)
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Admin client to bypass RLS for server-side aggregation
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get current user (from caller token)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userId = userData.user.id;

    // Get company id of the caller
    const { data: companyIdData, error: companyErr } = await supabase.rpc('get_user_company_id', { _user_id: userId });
    if (companyErr) {
      throw new Error(`Erro ao obter empresa: ${companyErr.message}`);
    }
    if (!companyIdData) {
      return new Response(JSON.stringify({ success: true, users: [] as CompanyUser[] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const companyId = String(companyIdData);

    // 1) All user ids linked to this company
    const { data: companyLinks, error: linksErr } = await admin
      .from('user_companies')
      .select('user_id')
      .eq('company_id', companyId);
    if (linksErr) throw new Error(`Erro ao listar usuários da empresa: ${linksErr.message}`);

    const userIds = (companyLinks ?? []).map((r: any) => r.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, users: [] as CompanyUser[] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2) Profiles
    const { data: profiles, error: profilesErr } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    if (profilesErr) throw new Error(`Erro ao buscar perfis: ${profilesErr.message}`);

    // 3) Roles
    const { data: roles, error: rolesErr } = await admin
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);
    if (rolesErr) throw new Error(`Erro ao buscar roles: ${rolesErr.message}`);

    // 4) Environments links
    const { data: envLinks, error: envErr } = await admin
      .from('user_environments')
      .select('user_id, environment_id')
      .in('user_id', userIds);
    if (envErr) throw new Error(`Erro ao buscar ambientes vinculados: ${envErr.message}`);

    // 5) Emails from Auth Admin API (single page is ok for small datasets)
    const emailsById = new Map<string, string>();
    // To reduce calls, try listUsers first (up to 1000)
    const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      // Fallback: ignore email
      // no-op
    } else {
      for (const u of listRes?.users ?? []) {
        if (userIds.includes(u.id)) emailsById.set(u.id, u.email ?? '');
      }
    }

    // Build map helpers
    const profileById = new Map<string, { id: string; full_name: string }>();
    (profiles ?? []).forEach((p: any) => profileById.set(p.id, p));

    const roleByUser = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleByUser.set(r.user_id, r.role));

    const envByUser = new Map<string, string[]>();
    (envLinks ?? []).forEach((l: any) => {
      const arr = envByUser.get(l.user_id) ?? [];
      arr.push(l.environment_id);
      envByUser.set(l.user_id, arr);
    });

    const users: CompanyUser[] = userIds.map((id) => {
      const prof = profileById.get(id);
      return {
        id,
        name: prof?.full_name ?? 'Usuário',
        email: emailsById.get(id) ?? null,
        role: roleByUser.get(id) ?? null,
        status: 'active',
        linked_environments: envByUser.get(id) ?? [],
      };
    });

    return new Response(JSON.stringify({ success: true, users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    console.error('list-company-users error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro inesperado' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
