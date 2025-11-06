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
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NewUserModal } from "../users/NewUserModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Environment } from "@/types/environment";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingEnvironment?: Environment | null;
  parentId?: string | null;
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

export function NewEnvironmentModal({ open, onOpenChange, onSuccess, editingEnvironment, parentId }: NewEnvironmentModalProps) {
  const [environmentType, setEnvironmentType] = useState<"parent" | "sub">("parent");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Factory");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentEnvironments, setParentEnvironments] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const isEditing = !!editingEnvironment;

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user]);

  // Populate form when editing or adding sub-environment
  useEffect(() => {
    if (open) {
      if (editingEnvironment) {
        setName(editingEnvironment.name);
        setDescription(editingEnvironment.description || "");
        setStatus(editingEnvironment.status);
        setEnvironmentType(editingEnvironment.parent_id ? "sub" : "parent");
        setSelectedParentId(editingEnvironment.parent_id || "");
      } else if (parentId) {
        setEnvironmentType("sub");
        setSelectedParentId(parentId);
      } else {
        // Reset form for new environment
        setName("");
        setDescription("");
        setStatus("active");
        setEnvironmentType("parent");
        setSelectedParentId("");
        setSelectedModelIds([]);
      }
    }
  }, [open, editingEnvironment, parentId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get company ID
      const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
      if (!companyIdData) return;

      const fetchedCompanyId = companyIdData as string;
      setCompanyId(fetchedCompanyId);

      // Fetch parent environments
      const { data: envData } = await supabase
        .from('environments')
        .select('id, name')
        .eq('company_id', fetchedCompanyId)
        .is('parent_id', null)
        .eq('status', 'active')
        .order('name');

      setParentEnvironments(envData || []);

      // Fetch models linked to this company
      const { data: companyModelsData } = await supabase
        .from('company_models')
        .select(`
          model_id,
          master_models (
            id,
            name,
            description,
            status
          )
        `)
        .eq('company_id', fetchedCompanyId)
        .eq('status', 'active');

      // Process models with criteria count
      const modelsWithCount = await Promise.all(
        (companyModelsData || []).map(async (cm: any) => {
          const model = cm.master_models;
          if (!model) return null;

          // Count criteria for this model
          const { count } = await supabase
            .from('master_model_criteria')
            .select('*', { count: 'exact', head: true })
            .eq('model_id', model.id);

          return {
            id: model.id,
            name: model.name,
            description: model.description,
            criteria_count: count || 0,
          };
        })
      );

      setAvailableModels(modelsWithCount.filter(Boolean));

      // If editing, fetch linked models (via criteria)
      if (editingEnvironment) {
        const { data: linkedCriteria } = await supabase
          .from('environment_criteria')
          .select(`
            criterion_id,
            company_criteria!inner (
              origin_model_id
            )
          `)
          .eq('environment_id', editingEnvironment.id);
        
        if (linkedCriteria) {
          // Get unique model IDs from linked criteria
          const modelIds = [...new Set(
            linkedCriteria
              .map((lc: any) => lc.company_criteria?.origin_model_id)
              .filter(Boolean)
          )];
          setSelectedModelIds(modelIds as string[]);
        }
      }
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

    if (environmentType === "sub" && !selectedParentId) {
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

      if (isEditing && editingEnvironment) {
        // Update existing environment
        const { error } = await supabase
          .from('environments')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            parent_id: environmentType === "sub" ? selectedParentId : null,
            status,
          })
          .eq('id', editingEnvironment.id);

        if (error) {
          console.error("Error updating environment:", error);
          toast({
            title: "Erro ao atualizar ambiente",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Update criteria links from selected models
        // Remove old links
        await supabase
          .from('environment_criteria')
          .delete()
          .eq('environment_id', editingEnvironment.id);

        // Add new links from selected models
        if (selectedModelIds.length > 0) {
          const { data: modelCriteria } = await supabase
            .from('company_criteria')
            .select('id')
            .eq('company_id', companyIdData as string)
            .in('origin_model_id', selectedModelIds);

          if (modelCriteria && modelCriteria.length > 0) {
            await supabase
              .from('environment_criteria')
              .insert(modelCriteria.map(c => ({
                environment_id: editingEnvironment.id,
                criterion_id: c.id
              })));
          }
        }

        toast({
          title: "✓ Ambiente atualizado!",
          description: `O ambiente "${name}" foi atualizado.`,
        });
      } else {
        // Insert new environment
        const { data: newEnv, error } = await supabase
          .from('environments')
          .insert([{
            company_id: companyIdData as string,
            name: name.trim(),
            description: description.trim() || null,
            parent_id: environmentType === "sub" ? selectedParentId : null,
            status,
          }])
          .select()
          .single();

        if (error) {
          console.error("Error creating environment:", error);
          toast({
            title: "Erro ao criar ambiente",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Link criteria from selected models
        if (newEnv && selectedModelIds.length > 0) {
          // Get all criteria IDs from selected models
          const { data: modelCriteria } = await supabase
            .from('company_criteria')
            .select('id')
            .eq('company_id', companyIdData as string)
            .in('origin_model_id', selectedModelIds);

          if (modelCriteria && modelCriteria.length > 0) {
            await supabase
              .from('environment_criteria')
              .insert(modelCriteria.map(c => ({
                environment_id: newEnv.id,
                criterion_id: c.id
              })));
          }
        }

        toast({
          title: "✓ Ambiente criado com sucesso!",
          description: `O ambiente "${name}" foi criado com ${selectedModelIds.length} ${selectedModelIds.length === 1 ? 'modelo vinculado' : 'modelos vinculados'}.`,
        });
      }

      // Reset form
      setName("");
      setIcon("Factory");
      setDescription("");
      setSelectedParentId("");
      setStatus("active");
      setEnvironmentType("parent");
      setSelectedModelIds([]);
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
          <DialogTitle>{isEditing ? "Editar Ambiente" : "Criar Novo Ambiente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações do ambiente" : "Adicione uma área ou setor para auditorias"}
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
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
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

          {/* Modelos Aplicáveis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Modelos de Critérios</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os modelos de critérios que devem ser avaliados neste ambiente
            </p>
            
            {availableModels.length === 0 ? (
              <div className="border rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo disponível. Os modelos são atribuídos pelo Administrador IFA.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[250px] border rounded-lg p-3">
                <div className="space-y-2">
                  {availableModels.map((model) => (
                    <div 
                      key={model.id}
                      className="flex items-start space-x-3 p-3 hover:bg-muted rounded-md transition-colors border"
                    >
                      <Checkbox
                        id={model.id}
                        checked={selectedModelIds.includes(model.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedModelIds([...selectedModelIds, model.id]);
                          } else {
                            setSelectedModelIds(selectedModelIds.filter(id => id !== model.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={model.id}
                          className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                        >
                          {model.name}
                          <Badge variant="secondary" className="text-xs">
                            {model.criteria_count} {model.criteria_count === 1 ? 'critério' : 'critérios'}
                          </Badge>
                        </Label>
                        {model.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {model.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {selectedModelIds.length > 0 && (
              <p className="text-xs text-primary font-medium">
                {selectedModelIds.length} {selectedModelIds.length === 1 ? 'modelo selecionado' : 'modelos selecionados'}
              </p>
            )}
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
                  {isEditing ? "Salvando..." : "Criando..."}
                </>
              ) : (
                isEditing ? "Salvar Alterações" : "Criar Ambiente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Modal de Criar Usuário */}
      <NewUserModal 
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        onSuccess={() => {
          setIsUserModalOpen(false);
          fetchData();
        }}
      />
    </Dialog>
  );
}
