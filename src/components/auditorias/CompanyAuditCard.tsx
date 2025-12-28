import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, ClipboardCheck } from "lucide-react";
import { ExportCompanyButton } from "@/components/reports/ExportButtons";

interface CompanyAuditCardProps {
  companyId: string;
  companyName: string;
  totalAudits: number;
  completedAudits: number;
  inProgressAudits: number;
  onClick: () => void;
}

export function CompanyAuditCard({
  companyId,
  companyName,
  totalAudits,
  completedAudits,
  inProgressAudits,
  onClick
}: CompanyAuditCardProps) {
  return (
    <Card className="p-3 sm:p-5 hover:shadow-md hover:border-primary/50 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Main content - clickable */}
        <div 
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={onClick}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {companyName}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <ClipboardCheck className="h-3 w-3" />
              {totalAudits} auditoria{totalAudits !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Badges and actions row */}
        <div className="flex items-center justify-between gap-2 ml-13 sm:ml-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {inProgressAudits > 0 && (
              <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                {inProgressAudits} em andamento
              </Badge>
            )}
            {completedAudits > 0 && (
              <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                {completedAudits} concluída{completedAudits !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {completedAudits > 0 && (
              <ExportCompanyButton 
                companyId={companyId} 
                companyName={companyName} 
                size="sm" 
                variant="ghost"
              />
            )}
            <ChevronRight 
              className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors cursor-pointer" 
              onClick={onClick}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
