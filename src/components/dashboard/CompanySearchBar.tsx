import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CompanySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function CompanySearchBar({ searchTerm, onSearchChange }: CompanySearchBarProps) {
  return (
    <div className="px-4 py-3 bg-background">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar empresas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg h-10"
        />
      </div>
    </div>
  );
}
