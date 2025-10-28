import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Criteria, SensoType } from "@/types/criteria";
import { useToast } from "@/hooks/use-toast";
import CriterionFormModal from "@/components/biblioteca/CriterionFormModal";

interface NewModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  editModel?: any;
}

const sensoColors: Record<string, string> = {
  "1S": "bg-red-100 text-red-700",
  "2S": "bg-orange-100 text-orange-700",
  "3S": "bg-yellow-100 text-yellow-700",
  "4S": "bg-green-100 text-green-700",
  "5S": "bg-blue-100 text-blue-700",
};

const NewModelModal = ({ open, onOpenChange, onSave, editModel }: NewModelModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedCriteria, setSelectedCriteria] = useState<Criteria[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sensoFilter, setSensoFilter] = useState<string>("Todos");
  const [availableCriteria, setAvailableCriteria] = useState<Criteria[]>([]);
  const [isCreateCriterionOpen, setIsCreateCriterionOpen] = useState(false);

  // Load criteria from localStorage
  useEffect(() => {
    const loadCriteria = () => {
      const stored = localStorage.getItem("criteria");
      if (stored) {
        const allCriteria = JSON.parse(stored);
        setAvailableCriteria(allCriteria);
        
        // If editing, load the selected criteria
        if (editModel?.selectedCriteria && editModel.selectedCriteria.length > 0) {
          const selected = allCriteria.filter((c: Criteria) => 
            editModel.selectedCriteria.includes(c.id)
          );
          setSelectedCriteria(selected);
        }
      } else {
        setAvailableCriteria([]);
      }
    };

    if (open) {
      loadCriteria();
      // Reset form if not editing
      if (!editModel) {
        setName("");
        setDescription("");
        setStatus("active");
        setSelectedCriteria([]);
      } else {
        setName(editModel.name || "");
        setDescription(editModel.description || "");
        setStatus(editModel.status || "active");
      }
    }
  }, [open, editModel]);

  const filteredCriteria = availableCriteria.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSenso = sensoFilter === "Todos" || c.senso === sensoFilter;
    const notSelected = !selectedCriteria.find((sc) => sc.id === c.id);
    return matchesSearch && matchesSenso && notSelected;
  });

  const handleAddCriterion = (criterion: Criteria) => {
    setSelectedCriteria([...selectedCriteria, criterion]);
  };

  const handleRemoveCriterion = (id: string) => {
    setSelectedCriteria(selectedCriteria.filter((c) => c.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...selectedCriteria];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setSelectedCriteria(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedCriteria.length - 1) return;
    const newList = [...selectedCriteria];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setSelectedCriteria(newList);
  };

  const handleSaveCriterion = (criterionData: any) => {
    // Save to localStorage
    const stored = localStorage.getItem("criteria");
    const criteria = stored ? JSON.parse(stored) : [];
    const newCriterion = {
      ...criterionData,
      id: criterionData.id || `C${String(criteria.length + 1).padStart(3, "0")}`,
    };
    criteria.push(newCriterion);
    localStorage.setItem("criteria", JSON.stringify(criteria));
    setAvailableCriteria(criteria);
    
    toast({
      title: "Critério criado!",
      description: "O critério foi adicionado à biblioteca",
    });
    
    setIsCreateCriterionOpen(false);
  };

  const handleSave = () => {
    if (!name.trim() || name.length < 5) {
      toast({
        title: "Erro de validação",
        description: "Nome deve ter pelo menos 5 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim() || description.length < 20) {
      toast({
        title: "Erro de validação",
        description: "Descrição deve ter pelo menos 20 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (selectedCriteria.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos 1 critério",
        variant: "destructive",
      });
      return;
    }

    const criteriaBySenso = selectedCriteria.reduce((acc, c) => {
      acc[c.senso] = (acc[c.senso] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    onSave({
      name,
      description,
      status,
      total_criteria: selectedCriteria.length,
      criteria_by_senso: {
        "1S": criteriaBySenso["1S"] || 0,
        "2S": criteriaBySenso["2S"] || 0,
        "3S": criteriaBySenso["3S"] || 0,
        "4S": criteriaBySenso["4S"] || 0,
        "5S": criteriaBySenso["5S"] || 0,
      },
      criteria_ids: selectedCriteria.map((c) => c.id),
    });

    // Reset form
    setName("");
    setDescription("");
    setStatus("active");
    setSelectedCriteria([]);
    onOpenChange(false);
  };

  const criteriaDistribution = selectedCriteria.reduce((acc, c) => {
    acc[c.senso] = (acc[c.senso] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editModel ? "Editar Modelo Mestre" : "Criar Novo Modelo Mestre"}</DialogTitle>
          <DialogDescription>
            Agrupe critérios para criar um template de avaliação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção 1: Informações Básicas */}
          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Modelo*</Label>
              <Input
                id="name"
                placeholder="Ex: 5S Industrial Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{name.length}/100 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição*</Label>
              <Textarea
                id="description"
                placeholder="Descreva quando e onde este modelo deve ser usado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{description.length}/500 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={(value) => setStatus(value as "active" | "inactive")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="font-normal cursor-pointer">
                    Ativo - Disponível para vincular às empresas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="font-normal cursor-pointer">
                    Inativo - Modelo oculto das empresas
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Seção 2: Seleção de Critérios */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Seleção de Critérios</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Coluna Esquerda: Disponíveis */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium mb-2">📚 Biblioteca de Critérios</h4>
                    <p className="text-sm text-muted-foreground">
                      {availableCriteria.length} critérios disponíveis
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsCreateCriterionOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Critério
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar critérios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={sensoFilter} onValueChange={setSensoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por Senso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos os Sensos</SelectItem>
                      <SelectItem value="1S">1S - Seiri</SelectItem>
                      <SelectItem value="2S">2S - Seiton</SelectItem>
                      <SelectItem value="3S">3S - Seiso</SelectItem>
                      <SelectItem value="4S">4S - Seiketsu</SelectItem>
                      <SelectItem value="5S">5S - Shitsuke</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredCriteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddCriterion(criterion)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {criterion.id} - {criterion.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge className={sensoColors[criterion.senso]} variant="secondary">
                              {criterion.senso}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {criterion.scoreType}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Peso: {criterion.weight}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          + Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {availableCriteria.length === 0 && (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhum critério criado ainda
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateCriterionOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Criar Primeiro Critério
                      </Button>
                    </div>
                  )}
                  {availableCriteria.length > 0 && filteredCriteria.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Nenhum critério encontrado com os filtros aplicados
                    </p>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Selecionados */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">✅ Critérios no Modelo</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCriteria.length} critérios adicionados
                    </p>
                  </div>
                  {selectedCriteria.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCriteria([])}
                      className="text-destructive"
                    >
                      Limpar Todos
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedCriteria.map((criterion, index) => (
                    <div key={criterion.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === selectedCriteria.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {criterion.id} - {criterion.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge className={sensoColors[criterion.senso]} variant="secondary">
                              {criterion.senso}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Peso: {criterion.weight}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCriterion(criterion.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {selectedCriteria.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Nenhum critério selecionado
                    </p>
                  )}
                </div>

                {selectedCriteria.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-medium">Distribuição por Senso:</p>
                    <div className="space-y-1 text-xs">
                      {["1S", "2S", "3S", "4S", "5S"].map((senso) => {
                        const count = criteriaDistribution[senso] || 0;
                        const percentage = Math.round((count / selectedCriteria.length) * 100);
                        return (
                          <div key={senso} className="flex items-center gap-2">
                            <span className="w-8 font-medium">{senso}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${sensoColors[senso].split(" ")[0]}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-16 text-right text-muted-foreground">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm font-medium pt-2">
                      Total: {selectedCriteria.length} critérios
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            Total: {selectedCriteria.length} critérios selecionados
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editModel ? "Salvar Alterações" : "Criar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CriterionFormModal
        open={isCreateCriterionOpen}
        onClose={() => setIsCreateCriterionOpen(false)}
        onSave={handleSaveCriterion}
        mode="create"
      />
    </Dialog>
  );
};

export default NewModelModal;
