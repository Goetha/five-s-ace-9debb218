import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CriteriaFilters, CriteriaTag } from "@/types/criteria";
import { X } from "lucide-react";

interface AdvancedFiltersProps {
  filters: CriteriaFilters;
  onFiltersChange: (filters: CriteriaFilters) => void;
  onClose: () => void;
}

const AdvancedFilters = ({ filters, onFiltersChange, onClose }: AdvancedFiltersProps) => {
  const tags: CriteriaTag[] = ["Industrial", "Escritório", "Banheiro", "Refeitório", "Almoxarifado", "Todos"];

  const handleTagToggle = (tag: CriteriaTag) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: filters.search,
      senso: "Todos",
      scoreType: "Todos",
      weightRange: "Todos",
      tags: [],
      status: "Todos",
    });
  };

  return (
    <Card className="border-2 border-primary/20 mb-4 animate-in slide-in-from-top-2 duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filtros Avançados</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Senso Filter */}
          <div className="space-y-2">
            <Label>Senso 5S</Label>
            <Select
              value={filters.senso}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, senso: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="1S">1S - Utilização</SelectItem>
                <SelectItem value="2S">2S - Organização</SelectItem>
                <SelectItem value="3S">3S - Limpeza</SelectItem>
                <SelectItem value="4S">4S - Padronização</SelectItem>
                <SelectItem value="5S">5S - Disciplina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score Type Filter */}
          <div className="space-y-2">
            <Label>Tipo de Pontuação</Label>
            <Select
              value={filters.scoreType}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, scoreType: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="0-10">0-10</SelectItem>
                <SelectItem value="C/NC">C/NC</SelectItem>
                <SelectItem value="0-5">0-5</SelectItem>
                <SelectItem value="Percentual">Percentual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weight Range Filter */}
          <div className="space-y-2">
            <Label>Faixa de Peso</Label>
            <Select
              value={filters.weightRange}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, weightRange: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Alto">Alto (8-10)</SelectItem>
                <SelectItem value="Médio">Médio (4-7)</SelectItem>
                <SelectItem value="Baixo">Baixo (1-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags Filter */}
        <div className="mt-4 space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={tag}
                  checked={filters.tags.includes(tag)}
                  onCheckedChange={() => handleTagToggle(tag)}
                />
                <label
                  htmlFor={tag}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {tag}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={onClose}>Aplicar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
