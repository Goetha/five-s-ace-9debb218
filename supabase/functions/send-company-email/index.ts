import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookEmailPayload {
  adminEmail: string;
  adminName: string;
  temporaryPassword: string;
  companyName: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Recebida requisição para enviar email de empresa');
    
    const payload: WebhookEmailPayload = await req.json();
    
    console.log('📤 Enviando webhook para endpoint externo:', {
      adminEmail: payload.adminEmail,
      adminName: payload.adminName,
      companyName: payload.companyName,
      timestamp: payload.timestamp,
      // Não logar senha por segurança
    });

    const WEBHOOK_URL = 'https://webhook.dev.copertino.shop/webhook/email';

    // Endpoint externo aceita somente GET. Enviar dados via query string
    const params = new URLSearchParams({
      adminEmail: payload.adminEmail,
      adminName: payload.adminName,
      temporaryPassword: payload.temporaryPassword,
      companyName: payload.companyName,
      timestamp: payload.timestamp,
    });

    const url = `${WEBHOOK_URL}?${params.toString()}`;
    const safeLogUrl = `${WEBHOOK_URL}?adminEmail=${encodeURIComponent(payload.adminEmail)}&adminName=${encodeURIComponent(payload.adminName)}&companyName=${encodeURIComponent(payload.companyName)}&timestamp=${encodeURIComponent(payload.timestamp)}`;
    console.log('➡️  Chamando webhook externo via GET:', safeLogUrl);

    const webhookResponse = await fetch(url, {
      method: 'GET',
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ Webhook falhou:', webhookResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Webhook failed: ${webhookResponse.status}`,
          details: errorText
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          },
        }
      );
    }

    const responseData = await webhookResponse.text();
    console.log('✅ Webhook enviado com sucesso:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email enviado com sucesso'
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar requisição:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
