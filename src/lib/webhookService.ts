export interface WebhookEmailPayload {
  adminEmail: string;
  adminName: string;
  temporaryPassword: string;
  companyName: string;
  timestamp: string;
}

/**
 * Sends a webhook notification when a new company is created
 * @param payload - Company and admin data to send
 * @returns Promise with success status and optional error message
 */
export async function sendCompanyCreationWebhook(
  payload: WebhookEmailPayload
): Promise<{ success: boolean; error?: string }> {
  const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-company-email`;
  
  try {
    console.log('📤 Chamando Edge Function para enviar email');
    console.log('📧 Payload:', { ...payload, temporaryPassword: '***' }); // Log without exposing password
    
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Request failed: ${response.status}`);
    }
    
    console.log('✅ Email enviado com sucesso via Edge Function');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
