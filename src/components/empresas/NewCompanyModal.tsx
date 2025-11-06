import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { CompanyFormData } from "@/types/company";
import { formatPhone } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { generateTemporaryPassword } from "@/lib/passwordGenerator";

interface AuditorData {
  id: string;
  name: string;
  email: string;
}

const companySchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("Email inválido"),
});

interface NewCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
}

export function NewCompanyModal({ open, onOpenChange, onSave }: NewCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditorForm, setShowAuditorForm] = useState(false);
  const [auditors, setAuditors] = useState<AuditorData[]>([]);
  const [auditorName, setAuditorName] = useState("");
  const [auditorEmail, setAuditorEmail] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const phone = watch("phone");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
  };

  const handleAddAuditor = () => {
    if (!auditorName.trim() || !auditorEmail.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email do avaliador.",
        variant: "destructive",
      });
      return;
    }

    const newAuditor: AuditorData = {
      id: Math.random().toString(36).substr(2, 9),
      name: auditorName.trim(),
      email: auditorEmail.trim(),
    };

    setAuditors([...auditors, newAuditor]);
    setAuditorName("");
    setAuditorEmail("");
    setShowAuditorForm(false);

    toast({
      title: "Avaliador adicionado",
      description: `${newAuditor.name} foi adicionado à lista.`,
    });
  };

  const handleRemoveAuditor = (id: string) => {
    setAuditors(auditors.filter(a => a.id !== id));
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    
    try {
      // Send webhook notification via Edge Function with all information
      const webhookPayload = {
        companyName: data.name,
        phone: data.phone,
        email: data.email,
        timestamp: new Date().toISOString(),
        hasAuditors: auditors.length > 0,
        auditors: auditors.length > 0 
          ? auditors.map(a => ({ name: a.name, email: a.email }))
          : "Não tem avaliador",
        auditorsCount: auditors.length,
      };

      console.log('📤 Enviando webhook com dados completos:', webhookPayload);

      const { error: webhookError } = await supabase.functions.invoke('send-company-email', {
        body: webhookPayload,
      });

      if (webhookError) {
        console.warn('⚠️ Erro ao enviar webhook:', webhookError);
      } else {
        console.log('✅ Webhook enviado com sucesso');
      }

      // Create auditors via Edge Function
      if (auditors.length > 0) {
        console.log('📤 Criando avaliadores:', auditors);
        
        for (const auditor of auditors) {
          const temporaryPassword = generateTemporaryPassword();
          
          const { error: auditorError } = await supabase.functions.invoke('create-company-user', {
            body: {
              email: auditor.email,
              name: auditor.name,
              password: temporaryPassword,
              role: 'auditor',
            },
          });

          if (auditorError) {
            console.warn(`⚠️ Erro ao criar avaliador ${auditor.name}:`, auditorError);
            toast({
              title: "Aviso",
              description: `Não foi possível criar o avaliador ${auditor.name}`,
              variant: "destructive",
            });
          } else {
            console.log(`✅ Avaliador ${auditor.name} criado com sucesso`);
          }
        }
      }

      // Save company data
      onSave(data);
      
      toast({
        title: "Empresa criada com sucesso!",
        description: auditors.length > 0 
          ? `Empresa e ${auditors.length} avaliador(es) criados.`
          : "Os dados da empresa foram salvos.",
      });
      
      reset();
      setAuditors([]);
      setShowAuditorForm(false);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a empresa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Cadastrar Nova Empresa</DialogTitle>
          <DialogDescription>
            Preencha os dados essenciais da empresa cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {/* Informações da Empresa */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Nome da Empresa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Ex: Indústria XYZ Ltda"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone || ""}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">
                    Email da Empresa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="contato@empresa.com.br"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção de Avaliadores */}
            <div>
              <Separator className="mb-4" />
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Avaliadores (Opcional)</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuditorForm(!showAuditorForm)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Avaliador
                </Button>
              </div>

              {/* Lista de avaliadores adicionados */}
              {auditors.length > 0 && (
                <div className="space-y-2 mb-4">
                  {auditors.map((auditor) => (
                    <div
                      key={auditor.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{auditor.name}</p>
                          <p className="text-xs text-muted-foreground">{auditor.email}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAuditor(auditor.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para adicionar avaliador */}
              {showAuditorForm && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="auditorName">Nome do Avaliador</Label>
                    <Input
                      id="auditorName"
                      value={auditorName}
                      onChange={(e) => setAuditorName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="auditorEmail">Email do Avaliador</Label>
                    <Input
                      id="auditorEmail"
                      type="email"
                      value={auditorEmail}
                      onChange={(e) => setAuditorEmail(e.target.value)}
                      placeholder="carlos@exemplo.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddAuditor}
                      disabled={isSubmitting}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAuditorForm(false);
                        setAuditorName("");
                        setAuditorEmail("");
                      }}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
