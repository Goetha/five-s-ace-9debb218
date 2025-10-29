// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 405,
    });
  }

  try {
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "userIds must be a non-empty array" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client A: authenticated (to read the requester from the Bearer token)
    const authedClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Client B: pure service-role (no Authorization header) for admin ops and DB cleanup
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    // Identify requester using the Bearer token
    const { data: authData, error: authError } = await authedClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 401,
      });
    }

    const requesterId = authData.user.id;

    // Prevent deleting own account in this action
    const filteredIds = userIds.filter((id: string) => id !== requesterId);

    // Check if IFA admin
    const { data: isAdminData } = await adminClient.rpc("is_ifa_admin", { _user_id: requesterId });

    if (!isAdminData) {
      // Not IFA admin, verify all target users belong to the requester's company
      const { data: companyIdData } = await adminClient.rpc("get_user_company_id", { _user_id: requesterId });
      if (!companyIdData) {
        return new Response(JSON.stringify({ success: false, message: "Empresa do solicitante não encontrada" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 403,
        });
      }

      const { data: links, error: linksError } = await adminClient
        .from("user_companies")
        .select("user_id, company_id")
        .in("user_id", filteredIds);

      if (linksError) {
        return new Response(JSON.stringify({ success: false, message: linksError.message }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        });
      }

      const companyId = String(companyIdData);
      // Usuários sem vínculo explícito são permitidos; bloqueie apenas os vinculados a outra empresa
      const forbidden = (links ?? []).filter((r: any) => r.company_id !== companyId).map((r: any) => r.user_id);
      if (forbidden.length > 0) {
        return new Response(JSON.stringify({ success: false, message: "Você só pode excluir usuários da sua empresa" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 403,
        });
      }
    }

    // Optional cleanup of related tables (best-effort)
    await adminClient.from("user_environments").delete().in("user_id", filteredIds);
    await adminClient.from("user_roles").delete().in("user_id", filteredIds);
    await adminClient.from("user_companies").delete().in("user_id", filteredIds);

    // Delete users from auth
    const results = await Promise.all(
      filteredIds.map(async (id: string) => {
        const { error } = await adminClient.auth.admin.deleteUser(id);
        return { id, error: error?.message ?? null };
      })
    );

    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Falha ao excluir alguns usuários", failed }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 207 },
      );
    }

    return new Response(JSON.stringify({ success: true, deleted: userIds.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: (e as Error).message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});
