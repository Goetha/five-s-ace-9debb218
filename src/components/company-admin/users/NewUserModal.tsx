import { useState } from "react";
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
import { mockEnvironments } from "@/data/mockEnvironments";
import { CompanyUserRole } from "@/types/companyUser";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewUserModal({ open, onOpenChange }: NewUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<CompanyUserRole>("auditor");
  const [linkedEnvironments, setLinkedEnvironments] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [passwordType, setPasswordType] = useState<"auto" | "manual">("auto");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const { toast } = useToast();

  const showEnvironments = role === "auditor" || role === "area_manager";

  const toggleEnvironment = (envId: string) => {
    setLinkedEnvironments((prev) =>
      prev.includes(envId) ? prev.filter((id) => id !== envId) : [...prev, envId]
    );
  };

  const selectAllEnvironments = () => {
    setLinkedEnvironments(mockEnvironments.map((env) => env.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    if (passwordType === "manual" && (!password || password !== confirmPassword)) {
      toast({
        title: "Erro nas senhas",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "✓ Usuário criado!",
      description: "Credenciais enviadas por email.",
    });

    // Reset form
    setName("");
    setEmail("");
    setPhone("");
    setPosition("");
    setRole("auditor");
    setLinkedEnvironments([]);
    setStatus("active");
    setPasswordType("auto");
    setPassword("");
    setConfirmPassword("");
    setSendEmail(true);
    onOpenChange(false);
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
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl">
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

                      <div className="flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="area_manager" id="manager" />
                        <Label htmlFor="manager" className="cursor-pointer flex-1">
                          <div className="font-medium">🟡 Gestor de Área</div>
                          <div className="text-xs text-muted-foreground">
                            Gerencia ambientes e resolve planos de ação
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="viewer" id="viewer" />
                        <Label htmlFor="viewer" className="cursor-pointer flex-1">
                          <div className="font-medium">⚪ Visualizador</div>
                          <div className="text-xs text-muted-foreground">
                            Apenas visualiza relatórios e dashboards
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
                      {mockEnvironments
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
                            {mockEnvironments
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
                        ))}
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
                  <Label>Senha</Label>
                  <RadioGroup value={passwordType} onValueChange={(v) => setPasswordType(v as "auto" | "manual")}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="auto" />
                        <Label htmlFor="auto" className="cursor-pointer">
                          Gerar senha automática
                        </Label>
                      </div>
                      {passwordType === "auto" && (
                        <div className="ml-6 flex items-center space-x-2">
                          <Checkbox
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                          />
                          <Label htmlFor="sendEmail" className="cursor-pointer text-sm">
                            Enviar credenciais por email
                          </Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="cursor-pointer">
                          Definir senha manualmente
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  {passwordType === "manual" && (
                    <div className="ml-6 space-y-2">
                      <Input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Confirmar senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se gerar automática, senha temporária será enviada por email
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Criar Usuário
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
