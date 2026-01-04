import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CompanySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function CompanySearchBar({ searchTerm, onSearchChange }: CompanySearchBarProps) {
  return (
    <div className="px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696A0]" />
        <Input
          type="text"
          placeholder="Pesquisar"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-[#202C33] border-none text-[#E9EDEF] placeholder:text-[#8696A0] rounded-lg h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
