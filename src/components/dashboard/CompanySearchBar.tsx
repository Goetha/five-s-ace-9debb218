import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CompanySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function CompanySearchBar({ searchTerm, onSearchChange }: CompanySearchBarProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar empresas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
