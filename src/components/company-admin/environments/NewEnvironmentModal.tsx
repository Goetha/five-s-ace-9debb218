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
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  companyId?: string;
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

export function NewEnvironmentModal({ open, onOpenChange, onSuccess, editingEnvironment, parentId, companyId: propsCompanyId }: NewEnvironmentModalProps) {
  const [environmentType, setEnvironmentType] = useState<"environment" | "location">("environment");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Factory");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [loading, setLoading] = useState(false);
  const [availableEnvironments, setAvailableEnvironments] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [allEnvironments, setAllEnvironments] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const isEditing = !!editingEnvironment;

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user]);

  // Populate form when editing or adding location
  useEffect(() => {
    if (open) {
      if (editingEnvironment) {
        setName(editingEnvironment.name);
        setDescription(editingEnvironment.description || "");
        setStatus(editingEnvironment.status);
        // Determinar tipo baseado na hierarquia
        const isLocation = editingEnvironment.parent_id && allEnvironments.find(e => e.id === editingEnvironment.parent_id)?.parent_id;
        setEnvironmentType(isLocation ? "location" : "environment");
        setSelectedParentId(editingEnvironment.parent_id || "");
      } else if (parentId) {
        setEnvironmentType("location");
        setSelectedParentId(parentId);
      } else {
        // Reset form for new environment
        setName("");
        setDescription("");
        setStatus("active");
        setEnvironmentType("environment");
        setSelectedParentId("");
        setSelectedModelIds([]);
      }
    }
  }, [open, editingEnvironment, parentId, allEnvironments]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Use propsCompanyId if provided, otherwise get from RPC
      let fetchedCompanyId = propsCompanyId;
      
      if (!fetchedCompanyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
        if (!companyIdData) return;
        fetchedCompanyId = companyIdData as string;
      }

      setCompanyId(fetchedCompanyId);

      // Fetch all environments for this company
      const { data: allEnvs } = await supabase
        .from('environments')
        .select('id, name, parent_id, company_id')
        .eq('company_id', fetchedCompanyId)
        .eq('status', 'active')
        .order('name');

      // Find the root environment (parent_id = NULL) - this is the company's main environment
      const rootEnv = allEnvs?.find(e => e.parent_id === null);
      
      // Environments are those with parent_id = root environment id
      const environments = allEnvs?.filter(e => e.parent_id === rootEnv?.id) || [];

      setAllEnvironments(allEnvs || []);
      setAvailableEnvironments(environments);

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
        description: `Preencha o nome do ${environmentType === 'environment' ? 'ambiente' : 'local'}.`,
        variant: "destructive",
      });
      return;
    }

    if (environmentType === "location" && !selectedParentId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o ambiente pai para este local.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      setLoading(true);

      // Use propsCompanyId if provided, otherwise get from RPC
      let companyIdData = propsCompanyId;
      
      if (!companyIdData) {
        const { data: rpcData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
        if (!rpcData) {
          toast({
            title: "Erro",
            description: "Empresa não encontrada.",
            variant: "destructive",
          });
          return;
        }
        companyIdData = rpcData as string;
      }

      if (isEditing && editingEnvironment) {
        // Update existing environment/location
        let finalParentId = selectedParentId;
        
        if (environmentType === "environment") {
          // For environments, find the root environment of the company
          const { data: rootEnv } = await supabase
            .from('environments')
            .select('id')
            .eq('company_id', companyIdData as string)
            .is('parent_id', null)
            .single();
          
          finalParentId = rootEnv?.id || null;
        }

        const { error } = await supabase
          .from('environments')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            parent_id: finalParentId,
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
          title: "✓ Atualizado com sucesso!",
          description: `${environmentType === 'environment' ? 'O ambiente' : 'O local'} "${name}" foi atualizado.`,
        });
      } else {
        // Insert new environment/location
        let finalParentId = selectedParentId;
        
        if (environmentType === "environment") {
          // For environments, find the root environment of the company
          const { data: rootEnv } = await supabase
            .from('environments')
            .select('id')
            .eq('company_id', companyIdData as string)
            .is('parent_id', null)
            .single();
          
          finalParentId = rootEnv?.id || null;
        }

        const { data: newEnv, error } = await supabase
          .from('environments')
          .insert([{
            company_id: companyIdData as string,
            name: name.trim(),
            description: description.trim() || null,
            parent_id: finalParentId,
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
          title: "✓ Criado com sucesso!",
          description: `${environmentType === 'environment' ? 'O ambiente' : 'O local'} "${name}" foi criado com ${selectedModelIds.length} ${selectedModelIds.length === 1 ? 'modelo vinculado' : 'modelos vinculados'}.`,
        });
      }

      // Reset form
      setName("");
      setIcon("Factory");
      setDescription("");
      setSelectedParentId("");
      setStatus("active");
      setEnvironmentType("environment");
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
          <DialogTitle>
            {isEditing 
              ? `Editar ${editingEnvironment?.parent_id && allEnvironments.find(e => e.id === editingEnvironment.parent_id)?.parent_id ? 'Local' : 'Ambiente'}`
              : environmentType === 'environment' ? 'Criar Novo Ambiente' : 'Criar Novo Local'
            }
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações" 
              : environmentType === 'environment' 
                ? "Ambientes são as grandes áreas da empresa (Produção, Administrativo, etc)" 
                : "Locais são subdivisões de ambientes (Linha 1, Sala 101, etc)"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo: Ambiente ou Local - Apenas quando não vem do botão da empresa */}
          {!isEditing && parentId && (
            <div className="space-y-3">
              <Label>Tipo *</Label>
              <div className="p-4 border rounded-lg bg-green-500/10 border-green-500/30">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Local</div>
                    <div className="text-sm text-muted-foreground">Exemplo: Linha 1, Sala 101, Depósito A</div>
                  </div>
                </div>
              </div>

              <div className="ml-8 space-y-2">
                <Label htmlFor="parent">Local dentro de *</Label>
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Selecione o ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEnvironments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Quando vem do botão da empresa - apenas mostrar que é Ambiente */}
          {!isEditing && !parentId && (
            <div className="space-y-3">
              <Label>Tipo *</Label>
              <div className="p-4 border rounded-lg bg-orange-500/10 border-orange-500/30">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="font-medium">Ambiente</div>
                    <div className="text-sm text-muted-foreground">Grande área da empresa (Produção, Administrativo, Estoque)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome {environmentType === 'environment' ? 'do Ambiente' : 'do Local'} *</Label>
            <Input
              id="name"
              placeholder={environmentType === 'environment' ? "Ex: Produção" : "Ex: Linha 1"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder={environmentType === 'environment' ? "Descreva este ambiente..." : "Descreva este local..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/300 caracteres
            </p>
          </div>

          {/* Modelos Aplicáveis - Apenas para Ambientes */}
          {environmentType === "environment" && (
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
          )}

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
                isEditing ? "Salvar Alterações" : environmentType === 'environment' ? "Criar Ambiente" : "Criar Local"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
