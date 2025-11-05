export interface UserWebhookPayload {
  userName: string;
  userEmail: string;
  userPhone: string;
  userPosition: string;
  userRole: string;
  temporaryPassword: string;
  companyName: string;
  timestamp: string;
}

/**
 * Sends a webhook notification when a new user is created
 * @param payload - User data to send
 * @returns Promise with success status and optional error message
 */
export async function sendUserCreationWebhook(
  payload: UserWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  const WEBHOOK_URL = 'https://webhook.dev.copertino.shop/webhook/email';
  
  try {
    console.log('📤 Enviando webhook de criação de usuário');
    console.log('📧 Payload:', { ...payload, temporaryPassword: '***' }); // Log without exposing password
    
    // Build query params
    const params = new URLSearchParams({
      userName: payload.userName,
      userEmail: payload.userEmail,
      userPhone: payload.userPhone || '',
      userPosition: payload.userPosition || '',
      userRole: payload.userRole,
      temporaryPassword: payload.temporaryPassword,
      companyName: payload.companyName,
      timestamp: payload.timestamp,
    });
    
    const response = await fetch(`${WEBHOOK_URL}?${params.toString()}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
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
