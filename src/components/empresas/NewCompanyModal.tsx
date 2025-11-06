import { useState, useEffect } from "react";
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
import { Auditor } from "@/types/auditor";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  onSave: (data: CompanyFormData) => Promise<string>;
}

export function NewCompanyModal({ open, onOpenChange, onSave }: NewCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditorForm, setShowAuditorForm] = useState(false);
  const [auditors, setAuditors] = useState<AuditorData[]>([]);
  const [auditorName, setAuditorName] = useState("");
  const [auditorEmail, setAuditorEmail] = useState("");
  const [existingAuditors, setExistingAuditors] = useState<Auditor[]>([]);
  const [selectedExistingAuditorIds, setSelectedExistingAuditorIds] = useState<string[]>([]);
  const [loadingAuditors, setLoadingAuditors] = useState(false);

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

  // Load existing auditors when modal opens
  useEffect(() => {
    if (open) {
      loadExistingAuditors();
    }
  }, [open]);

  const loadExistingAuditors = async () => {
    setLoadingAuditors(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-all-auditors');
      if (error) throw error;
      setExistingAuditors(data.auditors || []);
    } catch (error) {
      console.error('Error loading auditors:', error);
      toast({
        title: "Erro ao carregar avaliadores",
        description: "Não foi possível carregar a lista de avaliadores existentes.",
        variant: "destructive",
      });
    } finally {
      setLoadingAuditors(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
  };

  const handleToggleExistingAuditor = (auditorId: string) => {
    setSelectedExistingAuditorIds(prev => 
      prev.includes(auditorId) 
        ? prev.filter(id => id !== auditorId)
        : [...prev, auditorId]
    );
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
      // ✅ Validation: Prevent using IFA Admin email for company
      console.log('🔍 Verificando se o email pertence a um IFA Admin...');
      const { data: ifaAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'ifa_admin');

      if (ifaAdmins && ifaAdmins.length > 0) {
        for (const admin of ifaAdmins) {
          const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
          
          if (user?.email === data.email) {
            toast({
              title: "❌ Email não permitido",
              description: "Este email já é usado pelo Administrador IFA. Use outro email para a empresa.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Create company first to get the ID
      const companyId = await onSave(data);
      console.log('📝 Empresa criada com ID:', companyId);

      // ✅ NOVO: Criar admin principal da empresa (company_admin)
      console.log('👤 Criando admin principal da empresa...');
      const adminPassword = generateTemporaryPassword();

      const { data: adminUser, error: adminError } = await supabase.functions.invoke('create-company-user', {
        body: {
          email: data.email,
          name: `Admin - ${data.name}`,
          password: adminPassword,
          role: 'company_admin',
          companyId: companyId,
        },
      });

      if (adminError) {
        console.error('❌ Erro ao criar admin da empresa:', adminError);
        toast({
          title: "Erro Crítico",
          description: "Não foi possível criar o admin da empresa.",
          variant: "destructive",
        });
        throw adminError;
      }

      console.log('✅ Admin principal criado:', data.email);

      // Enviar webhook com credenciais do admin principal
      console.log('📤 Enviando credenciais do admin principal...');
      const { error: adminWebhookError } = await supabase.functions.invoke('send-company-email', {
        body: {
          adminEmail: data.email,
          adminName: `Admin - ${data.name}`,
          temporaryPassword: adminPassword,
          companyName: data.name,
          timestamp: new Date().toISOString(),
          auditor: false, // Admin principal da empresa
        },
      });

      if (adminWebhookError) {
        console.warn('⚠️ Erro ao enviar webhook do admin:', adminWebhookError);
      } else {
        console.log('✅ Webhook do admin enviado com sucesso');
      }

      // Create evaluators as company_admin via Edge Function
      const evaluatorCredentials: Array<{email: string, password: string, name: string}> = [];
      
      if (auditors.length > 0 && companyId) {
        console.log('📤 Criando avaliadores (role auditor) para empresa:', companyId);
        
        for (const auditor of auditors) {
          const temporaryPassword = generateTemporaryPassword();
          
          const { error: auditorError } = await supabase.functions.invoke('create-company-user', {
            body: {
              email: auditor.email,
              name: auditor.name,
              password: temporaryPassword,
              role: 'auditor', // garantir que terá papel de avaliador
              companyId: companyId,
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
            console.log(`✅ Avaliador ${auditor.name} criado com role auditor`);
            evaluatorCredentials.push({
              email: auditor.email,
              password: temporaryPassword,
              name: auditor.name,
            });
          }
        }

        // Enviar webhook com credenciais de cada avaliador
        for (const evaluator of evaluatorCredentials) {
          console.log(`📤 Enviando credenciais do avaliador: ${evaluator.name}...`);
          
          const { error: evalWebhookError } = await supabase.functions.invoke('send-company-email', {
            body: {
              adminEmail: evaluator.email,
              adminName: evaluator.name,
              temporaryPassword: evaluator.password,
              companyName: data.name,
              timestamp: new Date().toISOString(),
              auditor: true, // Avaliador (company_admin adicional)
            },
          });

          if (evalWebhookError) {
            console.warn(`⚠️ Erro ao enviar webhook do avaliador ${evaluator.name}:`, evalWebhookError);
          } else {
            console.log(`✅ Webhook do avaliador ${evaluator.name} enviado`);
          }
        }
      }
      
      // Link existing selected auditors to the company (preserving their current links)
      if (selectedExistingAuditorIds.length > 0) {
        console.log('🔗 Vinculando avaliadores existentes à empresa:', selectedExistingAuditorIds);
        
        for (const auditorId of selectedExistingAuditorIds) {
          // 1) Ensure the user has 'auditor' role; if not, add it (caller is IFA admin)
          const { data: roleCheck, error: roleCheckError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', auditorId)
            .eq('role', 'auditor')
            .maybeSingle();

          if (roleCheckError) {
            console.warn('⚠️ Erro ao verificar role do usuário:', roleCheckError);
          }

          if (!roleCheck) {
            const { error: addRoleError } = await supabase
              .from('user_roles')
              .insert({ user_id: auditorId, role: 'auditor' });
            if (addRoleError) {
              console.error('❌ Falha ao atribuir role auditor ao usuário:', addRoleError);
              throw addRoleError;
            }
            console.log('✅ Role auditor atribuído ao usuário', auditorId);
          }

          // 2) Merge company links and update via function
          const auditor = existingAuditors.find(a => a.id === auditorId);
          const currentCompanies = (auditor?.linked_companies ?? []).map(c => c.id).filter(Boolean);
          const company_ids = Array.from(new Set([...currentCompanies, companyId])).filter(Boolean) as string[];

          const { error: linkError } = await supabase.functions.invoke('update-auditor-companies', {
            body: {
              auditor_id: auditorId,
              company_ids,
            },
          });

          if (linkError) {
            console.error('❌ Erro ao vincular avaliador à empresa:', linkError);
            throw linkError;
          }
        }
      }

      const totalAuditors = auditors.length + selectedExistingAuditorIds.length;
      
      toast({
        title: "Empresa criada com sucesso! 🎉",
        description: totalAuditors > 0 
          ? `Admin principal criado! ${auditors.length} novo(s) avaliador(es) e ${selectedExistingAuditorIds.length} avaliador(es) existente(s) vinculados.`
          : "Admin principal criado! Email enviado com as credenciais.",
      });
      
      reset();
      setAuditors([]);
      setSelectedExistingAuditorIds([]);
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
              </div>

              {/* Existing Auditors Selection */}
              {loadingAuditors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : existingAuditors.length > 0 ? (
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-3 block">
                    Selecionar Avaliadores Existentes
                  </Label>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-3">
                      {existingAuditors.map((auditor) => (
                        <div
                          key={auditor.id}
                          className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <Checkbox
                            id={`auditor-${auditor.id}`}
                            checked={selectedExistingAuditorIds.includes(auditor.id)}
                            onCheckedChange={() => handleToggleExistingAuditor(auditor.id)}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1 space-y-1">
                            <label
                              htmlFor={`auditor-${auditor.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {auditor.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {auditor.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {auditor.linked_companies.length} empresa(s) vinculada(s)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedExistingAuditorIds.length > 0 && (
                    <p className="text-sm text-primary mt-2">
                      {selectedExistingAuditorIds.length} avaliador(es) selecionado(s)
                    </p>
                  )}
                </div>
              ) : null}

              {/* Add New Auditor Button */}
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium">Criar Novos Avaliadores</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuditorForm(!showAuditorForm)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Novo
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
