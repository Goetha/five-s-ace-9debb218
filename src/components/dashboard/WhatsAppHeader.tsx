import { Plus, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WhatsAppHeaderProps {
  onNewCompany: () => void;
}

export function WhatsAppHeader({ onNewCompany }: WhatsAppHeaderProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
      </nav>

      {/* Title + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Lista de empresas para auditoria
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <FileText className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={onNewCompany}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Empresa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
