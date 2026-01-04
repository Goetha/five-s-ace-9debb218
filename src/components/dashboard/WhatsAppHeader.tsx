import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WhatsAppHeaderProps {
  onNewCompany: () => void;
  onExportReport: () => void;
}

export function WhatsAppHeader({ onNewCompany, onExportReport }: WhatsAppHeaderProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
      </nav>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        Empresas
      </h1>
      <p className="text-muted-foreground mt-1">
        Lista de empresas para auditoria
      </p>

      {/* Actions - horizontal below description */}
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onExportReport}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Button 
          size="sm" 
          onClick={onNewCompany}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>
    </div>
  );
}
