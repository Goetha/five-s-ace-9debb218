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
  const WEBHOOK_URL = 'https://webhook.dev.copertino.shop/webhook/email';
  
  try {
    console.log('📤 Enviando webhook para:', WEBHOOK_URL);
    console.log('📧 Payload:', { ...payload, temporaryPassword: '***' }); // Log without exposing password
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Webhook enviado com sucesso');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
