import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyWebhookPayload {
  companyName: string;
  phone: string;
  email: string;
  timestamp: string;
}

interface UserCredentialsPayload {
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
    const payload = await req.json();
    const WEBHOOK_URL = 'https://webhook.dev.copertino.shop/webhook/email';

    // Detectar tipo de webhook baseado nos campos presentes
    const isUserCredentials = 'adminEmail' in payload && 'temporaryPassword' in payload;

    if (isUserCredentials) {
      // Webhook de credenciais de usuário (GET com query params)
      const userPayload = payload as UserCredentialsPayload;
      console.log('📤 Enviando webhook de credenciais de usuário');
      
      const params = new URLSearchParams({
        adminEmail: userPayload.adminEmail,
        adminName: userPayload.adminName,
        temporaryPassword: userPayload.temporaryPassword,
        companyName: userPayload.companyName,
        timestamp: userPayload.timestamp,
      });

      const url = `${WEBHOOK_URL}?${params.toString()}`;
      const safeLogUrl = `${WEBHOOK_URL}?adminEmail=${encodeURIComponent(userPayload.adminEmail)}&adminName=${encodeURIComponent(userPayload.adminName)}&companyName=${encodeURIComponent(userPayload.companyName)}&timestamp=${encodeURIComponent(userPayload.timestamp)}`;
      console.log('➡️  Chamando webhook via GET:', safeLogUrl);

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
      console.log('✅ Webhook de credenciais enviado com sucesso:', responseData);

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
    } else {
      // Webhook de dados da empresa (POST com JSON)
      const companyPayload = payload as CompanyWebhookPayload;
      console.log('📤 Enviando webhook de dados da empresa');
      console.log('Payload:', companyPayload);

      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyPayload),
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
      console.log('✅ Webhook de empresa enviado com sucesso:', responseData);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Webhook enviado com sucesso'
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          },
        }
      );
    }

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
