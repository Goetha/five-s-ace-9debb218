import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyUserRole } from "@/types/companyUser";
import { generateTemporaryPassword } from "@/lib/passwordGenerator";
import { useToast } from "@/hooks/use-toast";

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

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: data.name,
          phone: data.phone,
        },
      });

      if (authError) {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("Usuário não foi criado");
      }

      // 2. Update profile with additional info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          phone: data.phone || null,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      // 3. Assign role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role: data.role,
        }]);

      if (roleError) {
        throw new Error(`Erro ao atribuir role: ${roleError.message}`);
      }

      // 4. Link user to company
      const { error: companyError } = await supabase
        .from('user_companies')
        .insert([{
          user_id: authData.user.id,
          company_id: data.companyId,
        }]);

      if (companyError) {
        throw new Error(`Erro ao vincular à empresa: ${companyError.message}`);
      }

      // 5. Link auditor to environments (if applicable)
      if (data.role === 'auditor' && data.linkedEnvironments.length > 0) {
        const environmentLinks = data.linkedEnvironments.map(envId => ({
          user_id: authData.user.id,
          environment_id: envId,
        }));

        const { error: envError } = await supabase
          .from('user_environments')
          .insert(environmentLinks);

        if (envError) {
          console.error("Error linking environments:", envError);
        }
      }

      // 6. Send credentials email (if requested)
      if (data.sendEmail && data.passwordType === 'auto') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-user-credentials', {
            body: {
              email: data.email,
              name: data.name,
              temporaryPassword: password,
              companyName: 'Sua Empresa', // TODO: Get from context
            },
          });

          if (emailError) {
            console.error("Error sending email:", emailError);
            toast({
              title: "⚠️ Aviso",
              description: "Usuário criado, mas email não foi enviado.",
              variant: "default",
            });
          }
        } catch (emailErr) {
          console.error("Email error:", emailErr);
        }
      }

      toast({
        title: "✓ Usuário criado!",
        description: data.sendEmail 
          ? "Credenciais enviadas por email." 
          : "Usuário cadastrado com sucesso.",
      });

      return { success: true, userId: authData.user.id };
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
