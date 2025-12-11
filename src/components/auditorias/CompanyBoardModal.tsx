import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, X } from "lucide-react";
import { AuditBoardView } from "./AuditBoardView";

interface AuditGroupedData {
  company_id: string;
  company_name: string;
  areas: {
    area_id: string;
    area_name: string;
    environments: {
      environment_id: string;
      environment_name: string;
      locals: {
        local_id: string;
        local_name: string;
        audits: {
          id: string;
          status: string;
          score: number | null;
          score_level: string | null;
          started_at: string;
          auditor_name?: string;
        }[];
      }[];
    }[];
  }[];
}

interface CompanyBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyData: AuditGroupedData | null;
  onAuditClick: (auditId: string) => void;
}

export function CompanyBoardModal({
  open,
  onOpenChange,
  companyData,
  onAuditClick
}: CompanyBoardModalProps) {
  if (!open || !companyData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header fixo */}
      <div className="flex-shrink-0 bg-background border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm sm:text-lg truncate">{companyData.company_name}</h2>
              <p className="text-xs text-muted-foreground">Quadro 5S</p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <AuditBoardView
          groupedAudits={[companyData]}
          onAuditClick={onAuditClick}
          hideCompanyHeader
        />
      </div>
    </div>
  );
}
