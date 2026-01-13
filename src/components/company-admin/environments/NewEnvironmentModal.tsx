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
  Loader2,
  Layers,
  MapPin,
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
  const [environmentType, setEnvironmentType] = useState<"environment" | "sector">("environment");
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

  // Reset form when modal opens/closes or when editing changes
  useEffect(() => {
    if (open) {
      if (editingEnvironment) {
        setName(editingEnvironment.name);
        setIcon(editingEnvironment.icon || 'building');
        setDescription(editingEnvironment.description || '');
        setSelectedParentId(editingEnvironment.parent_id || '');
        setStatus(editingEnvironment.status);
        
        // Determine type based on parent_id hierarchy
        if (!editingEnvironment.parent_id) {
          setEnvironmentType('environment');
        } else {
          const parent = allEnvironments.find(e => e.id === editingEnvironment.parent_id);
          if (!parent) {
            setEnvironmentType('environment');
          } else if (!parent.parent_id) {
            // Parent is root (empresa), so this is an environment
            setEnvironmentType('environment');
          } else {
            // This is a sector (child of environment)
            setEnvironmentType('sector');
          }
        }
      } else {
        // Reset to defaults when creating new
        setName('');
        setIcon('building');
        setDescription('');
        setStatus('active');
        
        // Determine type based on parentId context
        if (parentId) {
          const parent = allEnvironments.find(e => e.id === parentId);
          if (!parent?.parent_id) {
            // Parent is root, creating an environment
            setEnvironmentType('environment');
          } else {
            // Creating sector (child of environment)
            setEnvironmentType('sector');
          }
          setSelectedParentId(parentId);
        } else {
          setEnvironmentType('environment');
          setSelectedParentId('');
        }
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

      setAllEnvironments(allEnvs || []);
      setAvailableEnvironments(allEnvs || []);

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
        try {
          const { data: envCriteria } = await supabase
            .from('environment_criteria')
            .select('criterion_id')
            .eq('environment_id', editingEnvironment.id);

          if (envCriteria && envCriteria.length > 0) {
            const criterionIds = envCriteria.map((ec: any) => ec.criterion_id);

            const { data: criteria } = await supabase
              .from('company_criteria')
              .select('id, origin_model_id')
              .in('id', criterionIds)
              .eq('company_id', fetchedCompanyId as string);

            const modelIds = Array.from(
              new Set(
                (criteria || [])
                  .map((c: any) => c.origin_model_id)
                  .filter((id: any) => id != null)
              )
            ) as string[];

            setSelectedModelIds(modelIds);
          } else {
            setSelectedModelIds([]);
          }
        } catch (error) {
          console.error('Error loading models:', error);
          setSelectedModelIds([]);
        }
      } else {
        setSelectedModelIds([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const selectedIcon = iconOptions.find((opt) => opt.value === icon);

  const getModalTitle = () => {
    if (editingEnvironment) {
      if (environmentType === 'environment') return 'Editar Ambiente';
      return 'Editar Setor';
    }
    if (environmentType === 'environment') return 'Criar Novo Ambiente';
    return 'Criar Novo Setor';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha o nome ${environmentType === 'environment' ? 'do ambiente' : 'do setor'}.`,
        variant: "destructive",
      });
      return;
    }

    if (environmentType === "sector" && !selectedParentId) {
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
        // Update existing
        let finalParentId = selectedParentId;
        
        if (environmentType === "environment") {
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
          console.error("Error updating:", error);
          toast({
            title: "Erro ao atualizar",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Update criteria links
        const { data: currentLinks } = await supabase
          .from('environment_criteria')
          .select('criterion_id')
          .eq('environment_id', editingEnvironment.id);
        
        const currentCriteriaIds = currentLinks?.map(l => l.criterion_id) || [];
        
        if (selectedModelIds.length > 0) {
          const { data: modelCriteria } = await supabase
            .from('company_criteria')
            .select('id')
            .eq('company_id', companyIdData as string)
            .in('origin_model_id', selectedModelIds)
            .eq('status', 'active');

          const newCriteriaIds = modelCriteria?.map(c => c.id) || [];

          const toAdd = newCriteriaIds.filter(id => !currentCriteriaIds.includes(id));
          const toRemove = currentCriteriaIds.filter(id => !newCriteriaIds.includes(id));

          if (toAdd.length > 0) {
            await supabase
              .from('environment_criteria')
              .insert(toAdd.map(criterionId => ({
                environment_id: editingEnvironment.id,
                criterion_id: criterionId
              })));
          }

          if (toRemove.length > 0) {
            await supabase
              .from('environment_criteria')
              .delete()
              .eq('environment_id', editingEnvironment.id)
              .in('criterion_id', toRemove);
          }
        }

        toast({
          title: "✓ Atualizado com sucesso!",
          description: `${environmentType === 'environment' ? 'O ambiente' : 'O setor'} "${name}" foi atualizado.`,
        });
      } else {
        // Create new
        let finalParentId = selectedParentId;
        
        if (environmentType === "environment") {
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
          console.error("Error creating:", error);
          toast({
            title: "Erro ao criar",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Link criteria from selected models
        if (newEnv && selectedModelIds.length > 0) {
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
          description: `${environmentType === 'environment' ? 'O ambiente' : 'O setor'} "${name}" foi criado.`,
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

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado.",
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
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações" 
              : `Preencha os dados ${environmentType === 'environment' ? 'do ambiente' : 'do setor'}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ScrollArea className="max-h-[60vh] pr-4">
            {/* Environment Type Info */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
              {environmentType === 'environment' ? (
                <>
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Ambientes são divisões da empresa (ex: Produção, Escritório, Depósito)
                  </span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Setores são subdivisões dos ambientes onde as auditorias são realizadas
                  </span>
                </>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="name">
                Nome {environmentType === 'environment' ? 'do Ambiente' : 'do Setor'} *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={environmentType === 'environment' ? 'Ex: Produção' : 'Ex: Linha de Montagem'}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva brevemente..."
                rows={3}
              />
            </div>

            {/* Parent Selection - Only for sectors */}
            {environmentType === 'sector' && (
              <div className="space-y-2 mb-4">
                <Label htmlFor="parent">Ambiente Pai *</Label>
                <Select
                  value={selectedParentId}
                  onValueChange={setSelectedParentId}
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Selecione o ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEnvironments
                      .filter(env => {
                        // Show environments (children of root)
                        const root = availableEnvironments.find(e => !e.parent_id);
                        return env.parent_id === root?.id;
                      })
                      .map((env) => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Applicable Models - Only for Environments */}
            {environmentType === 'environment' && !editingEnvironment && (
              <div className="space-y-2 mb-4">
                <Label>Modelos Aplicáveis</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Selecione os modelos de critérios que se aplicam a este ambiente
                </p>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {availableModels.map((model) => (
                    <div key={model.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`model-${model.id}`}
                        checked={selectedModelIds.includes(model.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedModelIds([...selectedModelIds, model.id]);
                          } else {
                            setSelectedModelIds(selectedModelIds.filter(id => id !== model.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`model-${model.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {model.name}
                        </label>
                        {model.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {model.description}
                          </p>
                        )}
                        <Badge variant="secondary" className="mt-1">
                          {model.criteria_count} critérios
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={(value: any) => setStatus(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="font-normal cursor-pointer">
                    Ativo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="font-normal cursor-pointer">
                    Inativo
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </ScrollArea>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
