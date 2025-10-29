import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendCredentialsRequest {
  email: string;
  name: string;
  temporaryPassword: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, temporaryPassword, companyName }: SendCredentialsRequest = await req.json();

    console.log(`Sending credentials to ${email} for company ${companyName}`);

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, just log the credentials
    console.log({
      to: email,
      subject: `Bem-vindo ao Sistema 5S - ${companyName}`,
      message: `Olá ${name}, suas credenciais de acesso:\nEmail: ${email}\nSenha temporária: ${temporaryPassword}`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Credentials email sent successfully" 
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
    console.error("Error sending credentials:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
