import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface OverviewFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  scoreFilter: string;
  onScoreFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export const OverviewFilters = ({
  searchTerm,
  onSearchChange,
  scoreFilter,
  onScoreFilterChange,
  sortBy,
  onSortByChange,
}: OverviewFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={scoreFilter} onValueChange={onScoreFilterChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Filtrar por Score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Scores</SelectItem>
          <SelectItem value="excellent">Excelente (9-10)</SelectItem>
          <SelectItem value="good">Bom (7-8)</SelectItem>
          <SelectItem value="needs-improvement">Precisa Melhorar (4-6)</SelectItem>
          <SelectItem value="critical">Crítico (0-3)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="score-desc">Maior Score</SelectItem>
          <SelectItem value="score-asc">Menor Score</SelectItem>
          <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
          <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          <SelectItem value="last-audit">Última Auditoria</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
