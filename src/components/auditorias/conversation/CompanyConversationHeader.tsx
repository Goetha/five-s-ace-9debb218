import { ArrowLeft, FileText, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompanyConversationHeaderProps {
  companyName: string;
  totalAudits: number;
  onBack: () => void;
  onExportReport: () => void;
  onViewDetails?: () => void;
}

export function CompanyConversationHeader({
  companyName,
  totalAudits,
  onBack,
  onExportReport,
  onViewDetails,
}: CompanyConversationHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Gerar cor baseada no nome
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-2 py-2">
      <div className="flex items-center gap-2">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar */}
        <Avatar className={`h-10 w-10 ${getAvatarColor(companyName)}`}>
          <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
            {getInitials(companyName)}
          </AvatarFallback>
        </Avatar>

        {/* Nome e Info */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate text-foreground">{companyName}</h1>
          <p className="text-xs text-muted-foreground">
            {totalAudits} {totalAudits === 1 ? "auditoria" : "auditorias"}
          </p>
        </div>

        {/* Botão Exportar PDF */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onExportReport}
          title="Exportar relatório"
        >
          <FileText className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onViewDetails && (
              <DropdownMenuItem onClick={onViewDetails}>
                Ver detalhes da empresa
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
