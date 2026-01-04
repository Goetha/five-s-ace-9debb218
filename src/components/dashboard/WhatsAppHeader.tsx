import { MoreVertical, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppHeaderProps {
  onNewCompany: () => void;
  onExport?: () => void;
}

export function WhatsAppHeader({ onNewCompany, onExport }: WhatsAppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#1F2C34] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-[#8696A0] hover:text-foreground hover:bg-[#2A3942]">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#233138] border-[#3B4A54]">
            <DropdownMenuItem className="text-[#E9EDEF] focus:bg-[#2A3942] focus:text-[#E9EDEF]">
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[#E9EDEF] focus:bg-[#2A3942] focus:text-[#E9EDEF]">
              Estatísticas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <h1 className="text-xl font-medium text-[#E9EDEF]">Empresas</h1>
      </div>
      
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#8696A0] hover:text-foreground hover:bg-[#2A3942]"
          onClick={onExport}
        >
          <FileText className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#8696A0] hover:text-foreground hover:bg-[#2A3942]"
          onClick={onNewCompany}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
