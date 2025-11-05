import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompanyUserRole } from "@/types/companyUser";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateUser } from "@/hooks/useCreateUser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Environment {
  id: string;
  name: string;
  parent_id: string | null;
}

export function NewUserModal({ open, onOpenChange, onSuccess }: NewUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<CompanyUserRole>("auditor");
  const [linkedEnvironments, setLinkedEnvironments] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [sendEmail, setSendEmail] = useState(true);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  
  const { createUser, isLoading } = useCreateUser();
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const hideEnvSectionOnAmbientes = location.pathname.startsWith("/admin-empresa/ambientes");

  const showEnvironments = role === "auditor" && !hideEnvSectionOnAmbientes;

  // Fetch user's company and environments
  useEffect(() => {
    if (open && user) {
      fetchCompanyAndEnvironments();
    }
  }, [open, user]);

  const fetchCompanyAndEnvironments = async () => {
    if (!user) return;

    try {
      // Safer: get company id using backend function (handles no-row case)
      const { data: companyIdRpc, error: companyError } = await supabase.rpc('get_user_company_id', { _user_id: user.id });

      if (companyError) {
        console.error("Error fetching company id via RPC:", companyError);
        return;
      }

      if (companyIdRpc) {
        const cid = companyIdRpc as string;
        setCompanyId(cid);

        // Fetch environments for this company
        const { data: envData, error: envError } = await supabase
          .from('environments')
          .select('id, name, parent_id')
          .eq('company_id', cid)
          .eq('status', 'active')
          .order('name');

        if (envError) {
          console.error("Error fetching environments:", envError);
        } else {
          setEnvironments(envData || []);
        }
      }
    } catch (error) {
      console.error("Error in fetchCompanyAndEnvironments:", error);
    }
  };

  const toggleEnvironment = (envId: string) => {
    setLinkedEnvironments((prev) =>
      prev.includes(envId) ? prev.filter((id) => id !== envId) : [...prev, envId]
    );
  };

  const selectAllEnvironments = () => {
    setLinkedEnvironments(environments.map((env) => env.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({ title: "Dados obrigatórios", description: "Preencha nome e email.", variant: "destructive" });
      return;
    }

    // Garante companyId (tenta via RPC se ainda não carregou)
    let cid = companyId;
    if (!cid && user) {
      const { data: companyIdRpc } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
      if (companyIdRpc) {
        cid = companyIdRpc as string;
        setCompanyId(cid);
      }
    }

    if (!cid) {
      toast({ title: "Empresa não encontrada", description: "Sua conta não está vinculada a uma empresa.", variant: "destructive" });
      return;
    }

    const result = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone,
      position,
      role,
      linkedEnvironments,
      status,
      passwordType: 'auto',
      sendEmail,
      companyId,
    });

    if (result.success) {
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setPosition("");
      setRole("auditor");
      setLinkedEnvironments([]);
      setStatus("active");
      setSendEmail(true);
      onOpenChange(false);
      
      // Refresh parent list
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          <DialogDescription>Adicione um colaborador ao sistema</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* COLUNA ESQUERDA */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Dados Pessoais</h3>

                <div className="flex justify-center">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {name.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este email será usado para login
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Cargo/Função</Label>
                  <Input
                    id="position"
                    placeholder="Ex: Supervisor de Produção"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
              </div>

              {/* COLUNA DIREITA */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Perfil e Permissões</h3>

                <div className="space-y-3">
                  <Label>Perfil do Usuário *</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as CompanyUserRole)}>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 p-3 border rounded-lg opacity-50">
                        <RadioGroupItem value="company_admin" id="admin" disabled />
                        <Label htmlFor="admin" className="cursor-not-allowed flex-1">
                          <div className="font-medium">🔵 Admin da Empresa</div>
                          <div className="text-xs text-muted-foreground">
                            Acesso total (apenas você pode ser admin)
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="auditor" id="auditor" />
                        <Label htmlFor="auditor" className="cursor-pointer flex-1">
                          <div className="font-medium">🟢 Avaliador</div>
                          <div className="text-xs text-muted-foreground">
                            Aplica auditorias nos ambientes designados
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {showEnvironments && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Vincular a Ambientes</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={selectAllEnvironments}
                      >
                        Selecionar Todos
                      </Button>
                    </div>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {environments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum ambiente cadastrado
                        </p>
                      ) : (
                        environments
                          .filter((env) => !env.parent_id)
                          .map((env) => (
                            <div key={env.id}>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={env.id}
                                  checked={linkedEnvironments.includes(env.id)}
                                  onCheckedChange={() => toggleEnvironment(env.id)}
                                />
                                <Label htmlFor={env.id} className="cursor-pointer font-medium">
                                  {env.name}
                                </Label>
                              </div>
                              {environments
                                .filter((sub) => sub.parent_id === env.id)
                                .map((sub) => (
                                  <div key={sub.id} className="ml-6 flex items-center space-x-2 mt-1">
                                    <Checkbox
                                      id={sub.id}
                                      checked={linkedEnvironments.includes(sub.id)}
                                      onCheckedChange={() => toggleEnvironment(sub.id)}
                                    />
                                    <Label htmlFor={sub.id} className="cursor-pointer text-sm">
                                      {sub.name}
                                    </Label>
                                  </div>
                                ))}
                            </div>
                          ))
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione os ambientes que este usuário poderá acessar
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status Inicial</Label>
                  <RadioGroup value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="active" />
                      <Label htmlFor="active" className="cursor-pointer">
                        Ativo - Usuário pode fazer login
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inactive" id="inactive" />
                      <Label htmlFor="inactive" className="cursor-pointer">
                        Inativo - Acesso bloqueado
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Notificações</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendEmail"
                        checked={sendEmail}
                        onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                      />
                      <Label htmlFor="sendEmail" className="cursor-pointer">
                        Enviar credenciais por email
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uma senha temporária será gerada automaticamente e enviada ao usuário
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Usuário"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
