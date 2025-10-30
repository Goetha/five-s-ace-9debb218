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
import { CompanyUser, CompanyUserRole } from "@/types/companyUser";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  user: CompanyUser | null;
}

interface Environment {
  id: string;
  name: string;
  parent_id: string | null;
}

export function EditUserModal({ open, onOpenChange, onSuccess, user }: EditUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<CompanyUserRole>("auditor");
  const [linkedEnvironments, setLinkedEnvironments] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const showEnvironments = role === "auditor";

  // Populate form when user changes
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setPosition(user.position || "");
      setRole(user.role);
      setLinkedEnvironments(user.linked_environments || []);
      setStatus(user.status);
      fetchEnvironments();
    }
  }, [open, user]);

  const fetchEnvironments = async () => {
    if (!currentUser) return;

    try {
      const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: currentUser.id });
      if (!companyIdData) return;

      const { data: envData, error: envError } = await supabase
        .from('environments')
        .select('id, name, parent_id')
        .eq('company_id', companyIdData as string)
        .eq('status', 'active')
        .order('name');

      if (envError) {
        console.error("Error fetching environments:", envError);
      } else {
        setEnvironments(envData || []);
      }
    } catch (error) {
      console.error("Error in fetchEnvironments:", error);
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

    if (!name.trim() || !user) {
      toast({ 
        title: "Dados obrigatórios", 
        description: "Preencha o nome do usuário.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role if changed
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      // Update environment links
      // First, delete existing links
      await supabase
        .from('user_environments')
        .delete()
        .eq('user_id', user.id);

      // Then insert new links
      if (linkedEnvironments.length > 0) {
        const envLinks = linkedEnvironments.map(envId => ({
          user_id: user.id,
          environment_id: envId
        }));

        const { error: envError } = await supabase
          .from('user_environments')
          .insert(envLinks);

        if (envError) throw envError;
      }

      toast({
        title: "✓ Usuário atualizado",
        description: `As informações de ${name} foram atualizadas com sucesso.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Atualize as informações do colaborador</DialogDescription>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
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
                            Perfil reservado
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="area_manager" id="area_manager" />
                        <Label htmlFor="area_manager" className="cursor-pointer flex-1">
                          <div className="font-medium">🟡 Gestor de Área</div>
                          <div className="text-xs text-muted-foreground">
                            Gerencia ambientes e resolve planos de ação
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

                      <div className="flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="viewer" id="viewer" />
                        <Label htmlFor="viewer" className="cursor-pointer flex-1">
                          <div className="font-medium">⚪ Visualizador</div>
                          <div className="text-xs text-muted-foreground">
                            Apenas visualiza relatórios
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
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
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
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
