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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Factory,
  Package,
  Utensils,
  Wrench,
  Briefcase,
  Car,
  Trees,
  Cog,
  Folder,
  Plus,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { NewUserModal } from "../users/NewUserModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const iconOptions = [
  { value: "Factory", label: "Produção", Icon: Factory },
  { value: "Building2", label: "Escritório", Icon: Building2 },
  { value: "Package", label: "Almoxarifado", Icon: Package },
  { value: "Utensils", label: "Refeitório", Icon: Utensils },
  { value: "Wrench", label: "Manutenção", Icon: Wrench },
  { value: "Briefcase", label: "Administrativo", Icon: Briefcase },
  { value: "Car", label: "Estacionamento", Icon: Car },
  { value: "Trees", label: "Área Externa", Icon: Trees },
  { value: "Cog", label: "Outros", Icon: Cog },
];

export function NewEnvironmentModal({ open, onOpenChange, onSuccess }: NewEnvironmentModalProps) {
  const [environmentType, setEnvironmentType] = useState<"parent" | "sub">("parent");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Factory");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentEnvironments, setParentEnvironments] = useState<any[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch parent environments and eligible users when modal opens
  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get company ID
      const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
      if (!companyIdData) return;

      // Fetch parent environments
      const { data: envData } = await supabase
        .from('environments')
        .select('id, name')
        .eq('company_id', companyIdData as string)
        .is('parent_id', null)
        .eq('status', 'active')
        .order('name');

      setParentEnvironments(envData || []);

      // For now, we'll skip fetching users since we don't have proper user data structure yet
      setEligibleUsers([]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const selectedIcon = iconOptions.find((opt) => opt.value === icon);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do ambiente.",
        variant: "destructive",
      });
      return;
    }

    if (environmentType === "sub" && !parentId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o ambiente pai.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      setLoading(true);

      // Get company ID
      const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
      if (!companyIdData) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Insert environment
      const { error } = await supabase
        .from('environments')
        .insert([{
          company_id: companyIdData as string,
          name: name.trim(),
          description: description.trim() || null,
          parent_id: environmentType === "sub" ? parentId : null,
          responsible_user_id: responsibleId || null,
          status,
        }]);

      if (error) {
        console.error("Error creating environment:", error);
        toast({
          title: "Erro ao criar ambiente",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✓ Ambiente criado com sucesso!",
        description: `O ambiente "${name}" foi criado.`,
      });

      // Reset form
      setName("");
      setIcon("Factory");
      setDescription("");
      setParentId("");
      setResponsibleId("");
      setStatus("active");
      setEnvironmentType("parent");
      onOpenChange(false);

      // Call onSuccess callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar o ambiente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Ambiente</DialogTitle>
          <DialogDescription>
            Adicione uma área ou setor para auditorias
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Ambiente */}
          <div className="space-y-3">
            <Label>Tipo de Ambiente *</Label>
            <RadioGroup value={environmentType} onValueChange={(v) => setEnvironmentType(v as "parent" | "sub")}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <RadioGroupItem value="parent" id="parent" />
                <Label htmlFor="parent" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Ambiente Principal</div>
                    <div className="text-sm text-muted-foreground">Raiz da hierarquia</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <RadioGroupItem value="sub" id="sub" />
                <Label htmlFor="sub" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Folder className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <div className="font-medium">Sub-ambiente</div>
                    <div className="text-sm text-muted-foreground">Pertence a um ambiente pai</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {environmentType === "sub" && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="parent">Sub-ambiente de *</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Selecione o ambiente pai" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentEnvironments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Ambiente *</Label>
            <Input
              id="name"
              placeholder="Ex: Linha de Produção 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label htmlFor="icon">Ícone do Ambiente</Label>
            <div className="flex gap-4 items-center">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="icon" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIcon && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <selectedIcon.Icon className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva este ambiente e suas características..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/300 caracteres
            </p>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável pelo Ambiente</Label>
            <div className="flex gap-2">
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger id="responsible" className="flex-1">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {eligibleUsers.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Nenhum usuário disponível
                    </div>
                  ) : (
                    eligibleUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">{user.role_label}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsUserModalOpen(true)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional: Você pode atribuir um responsável agora ou depois
            </p>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label>Status Inicial</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="cursor-pointer">
                  Ativo - Disponível para auditorias
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="inactive" />
                <Label htmlFor="inactive" className="cursor-pointer">
                  Inativo - Oculto dos avaliadores
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Ambiente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Modal de Criar Usuário */}
      <NewUserModal open={isUserModalOpen} onOpenChange={setIsUserModalOpen} />
    </Dialog>
  );
}
