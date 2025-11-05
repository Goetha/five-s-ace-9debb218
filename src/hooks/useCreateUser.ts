import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyUserRole } from "@/types/companyUser";
import { generateTemporaryPassword } from "@/lib/passwordGenerator";
import { useToast } from "@/hooks/use-toast";
import { sendUserCreationWebhook } from "@/lib/userWebhookService";
import type { Database } from "@/integrations/supabase/types";

interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role: CompanyUserRole;
  linkedEnvironments: string[];
  status: 'active' | 'inactive';
  passwordType: 'auto' | 'manual';
  password?: string;
  sendEmail: boolean;
  companyId: string;
}

export function useCreateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createUser = async (data: CreateUserData) => {
    setIsLoading(true);
    
    try {
      // Generate or use provided password
      const password = data.passwordType === 'auto' 
        ? generateTemporaryPassword() 
        : data.password!;

      // Call Edge Function to create user (requires admin privileges)
      const { data: result, error: functionError } = await supabase.functions.invoke('create-company-user', {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          position: data.position,
          role: data.role,
          linkedEnvironments: data.linkedEnvironments,
          status: data.status,
          password: password,
          companyId: data.companyId,
        },
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message || "Erro ao criar usuário");
      }

      if (!result?.success) {
        throw new Error(result?.error || "Erro ao criar usuário");
      }

      // Fetch company name for webhook context
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', data.companyId)
        .maybeSingle();

      // Send webhook only when a NEW user was created
      if (result?.created && data.sendEmail && data.passwordType === 'auto') {
        try {
          const webhookResult = await sendUserCreationWebhook({
            userName: data.name,
            userEmail: data.email,
            userPhone: data.phone || '',
            userPosition: data.position || '',
            userRole: data.role,
            temporaryPassword: password,
            companyName: companyData?.name || 'Empresa',
            timestamp: new Date().toISOString(),
          });

          if (!webhookResult.success) {
            console.error("Error sending webhook:", webhookResult.error);
            toast({
              title: "⚠️ Aviso",
              description: "Usuário criado, mas webhook não foi enviado.",
              variant: "default",
            });
          }
        } catch (webhookErr) {
          console.error("Webhook error:", webhookErr);
        }
      }

      toast({
        title: "✓ Usuário criado!",
        description: data.sendEmail 
          ? "Credenciais enviadas por email." 
          : "Usuário cadastrado com sucesso.",
      });

      return { success: true, userId: result.userId };
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { createUser, isLoading };
}
