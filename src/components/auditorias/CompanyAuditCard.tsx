import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, ClipboardCheck } from "lucide-react";

interface CompanyAuditCardProps {
  companyId: string;
  companyName: string;
  totalAudits: number;
  completedAudits: number;
  inProgressAudits: number;
  onClick: () => void;
}

export function CompanyAuditCard({
  companyName,
  totalAudits,
  completedAudits,
  inProgressAudits,
  onClick
}: CompanyAuditCardProps) {
  return (
    <Card 
      className="p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors">
              {companyName}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <ClipboardCheck className="h-3 w-3" />
                {totalAudits} auditoria{totalAudits !== 1 ? 's' : ''}
              </Badge>
              {inProgressAudits > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                  {inProgressAudits} em andamento
                </Badge>
              )}
              {completedAudits > 0 && (
                <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                  {completedAudits} concluída{completedAudits !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </Card>
  );
}
