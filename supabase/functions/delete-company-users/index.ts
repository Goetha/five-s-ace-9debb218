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

    // Forward caller's JWT so we can identify the requester
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Identify requester
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 401,
      });
    }

    const requesterId = authData.user.id;

    // Check if IFA admin
    const { data: isAdminData } = await supabase.rpc("is_ifa_admin", { _user_id: requesterId });

    if (!isAdminData) {
      // Not IFA admin, verify all target users belong to the requester's company
      const { data: companyIdData } = await supabase.rpc("get_user_company_id", { _user_id: requesterId });
      if (!companyIdData) {
        return new Response(JSON.stringify({ success: false, message: "Empresa do solicitante não encontrada" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 403,
        });
      }

      const { data: allowedLinks, error: linksError } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", companyIdData as string)
        .in("user_id", userIds);

      if (linksError) {
        return new Response(JSON.stringify({ success: false, message: linksError.message }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        });
      }

      const allowedIds = new Set((allowedLinks ?? []).map((r: any) => r.user_id));
      const notAllowed = userIds.filter((id: string) => !allowedIds.has(id));
      if (notAllowed.length > 0) {
        return new Response(JSON.stringify({ success: false, message: "Você só pode excluir usuários da sua empresa" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 403,
        });
      }
    }

    // Optional cleanup of related tables (best-effort)
    await supabase.from("user_environments").delete().in("user_id", userIds);
    await supabase.from("user_roles").delete().in("user_id", userIds);
    await supabase.from("user_companies").delete().in("user_id", userIds);

    // Delete users from auth
    const results = await Promise.all(
      userIds.map(async (id: string) => {
        const { error } = await supabase.auth.admin.deleteUser(id);
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
