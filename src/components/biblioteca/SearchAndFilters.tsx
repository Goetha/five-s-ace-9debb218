import { Search, Filter, Plus, LayoutGrid, Table } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface SearchAndFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  onNewCriterion: () => void;
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
}

const SearchAndFilters = ({
  searchValue,
  onSearchChange,
  onToggleFilters,
  showFilters,
  onNewCriterion,
  viewMode,
  onViewModeChange,
}: SearchAndFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar critérios..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* View Mode Toggle */}
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as "table" | "cards")}>
        <ToggleGroupItem value="table" aria-label="Visualizar como tabela">
          <Table className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="cards" aria-label="Visualizar como cards">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Filter Button */}
      <Button
        variant={showFilters ? "default" : "outline"}
        onClick={onToggleFilters}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filtros Avançados</span>
      </Button>

      {/* New Criteria Button */}
      <Button 
        className="flex items-center gap-2 bg-primary hover:bg-primary-hover"
        onClick={onNewCriterion}
      >
        <Plus className="h-4 w-4" />
        <span>Novo Critério</span>
      </Button>
    </div>
  );
};

export default SearchAndFilters;
