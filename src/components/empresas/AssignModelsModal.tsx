import { useState, useEffect } from "react";
import { Company } from "@/types/company";
import { MasterModel } from "@/types/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import NewModelModal from "@/components/modelos/NewModelModal";

interface AssignModelsModalProps {
  company: Company | null;
  models: MasterModel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (linkedModels: string[]) => void;
  onCreateModel?: (model: MasterModel) => void;
}

interface ModelLink {
  modelId: string;
  enabled: boolean;
  status: 'active' | 'inactive';
  notify: boolean;
}

export function AssignModelsModal({ 
  company, 
  models, 
  open, 
  onOpenChange, 
  onSave,
  onCreateModel
}: AssignModelsModalProps) {
  const [modelLinks, setModelLinks] = useState<Map<string, ModelLink>>(new Map());
  const [notifyAll, setNotifyAll] = useState(false);
  const [showNewModelModal, setShowNewModelModal] = useState(false);

  useEffect(() => {
    if (company && models.length > 0) {
      const links = new Map<string, ModelLink>();
      models.forEach(model => {
        links.set(model.id, {
          modelId: model.id,
          enabled: false,
          status: 'active',
          notify: false
        });
      });
      setModelLinks(links);
    }
  }, [company, models]);

  const toggleModel = (modelId: string, enabled: boolean) => {
    setModelLinks(prev => {
      const updated = new Map(prev);
      const link = updated.get(modelId);
      if (link) {
        updated.set(modelId, { ...link, enabled });
      }
      return updated;
    });
  };

  const updateModelStatus = (modelId: string, status: 'active' | 'inactive') => {
    setModelLinks(prev => {
      const updated = new Map(prev);
      const link = updated.get(modelId);
      if (link) {
        updated.set(modelId, { ...link, status });
      }
      return updated;
    });
  };

  const toggleNotify = (modelId: string, notify: boolean) => {
    setModelLinks(prev => {
      const updated = new Map(prev);
      const link = updated.get(modelId);
      if (link) {
        updated.set(modelId, { ...link, notify });
      }
      return updated;
    });
  };

  const handleSave = () => {
    const linkedModelIds = Array.from(modelLinks.values())
      .filter(link => link.enabled)
      .map(link => link.modelId);
    onSave(linkedModelIds);
    onOpenChange(false);
  };

  if (!company) return null;

  const enabledCount = Array.from(modelLinks.values()).filter(l => l.enabled).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>Atribuir Modelos Mestre</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Empresa: {company.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabledCount} modelos vinculados de {models.length} total
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewModelModal(true)}
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Modelo
              </Button>
            </div>
          </DialogHeader>

        <div className="space-y-4 py-4">
          {models.map(model => {
            const link = modelLinks.get(model.id);
            if (!link) return null;

            return (
              <Card key={model.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Switch
                          checked={link.enabled}
                          onCheckedChange={(checked) => toggleModel(model.id, checked)}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold">🎯 {model.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {model.total_criteria} critérios | {model.companies_using} empresas usando
                          </p>
                        </div>
                      </div>

                      {link.enabled && (
                        <div className="ml-12 space-y-3 mt-4 p-4 bg-muted/50 rounded-md">
                          <div>
                            <Label className="text-sm font-medium">Status do vínculo:</Label>
                            <RadioGroup
                              value={link.status}
                              onValueChange={(value: 'active' | 'inactive') => 
                                updateModelStatus(model.id, value)
                              }
                              className="mt-2 flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="active" id={`${model.id}-active`} />
                                <Label htmlFor={`${model.id}-active`} className="cursor-pointer font-normal">
                                  Ativo
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="inactive" id={`${model.id}-inactive`} />
                                <Label htmlFor={`${model.id}-inactive`} className="cursor-pointer font-normal">
                                  Inativo
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`notify-${model.id}`}
                              checked={link.notify}
                              onCheckedChange={(checked) => 
                                toggleNotify(model.id, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`notify-${model.id}`} 
                              className="cursor-pointer font-normal"
                            >
                              Notificar admin por email
                            </Label>
                          </div>
                        </div>
                      )}

                      {!link.enabled && (
                        <div className="ml-12 mt-2">
                          <Badge variant="secondary">Modelo não vinculado</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-all"
                checked={notifyAll}
                onCheckedChange={(checked) => setNotifyAll(checked as boolean)}
              />
              <Label htmlFor="notify-all" className="cursor-pointer font-normal">
                Notificar admin sobre todos os modelos vinculados
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Vínculos
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <NewModelModal
      open={showNewModelModal}
      onOpenChange={setShowNewModelModal}
      onSave={(model) => {
        if (onCreateModel) {
          onCreateModel(model);
        }
        setShowNewModelModal(false);
      }}
    />
    </>
  );
}
