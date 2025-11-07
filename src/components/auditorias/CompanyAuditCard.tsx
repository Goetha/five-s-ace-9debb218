import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import type { Audit } from "@/types/audit";
import { useNavigate } from "react-router-dom";

interface AuditWithLocation extends Audit {
  location_name: string;
  company_name: string;
}

interface CompanyAuditCardProps {
  companyId: string;
  companyName: string;
  audits: AuditWithLocation[];
  onStartNewAudit: (companyId: string, companyName: string) => void;
}

export function CompanyAuditCard({ companyId, companyName, audits, onStartNewAudit }: CompanyAuditCardProps) {
  const navigate = useNavigate();
  
  const inProgressAudits = audits.filter(a => a.status === 'in_progress');
  const completedAudits = audits.filter(a => a.status === 'completed').slice(0, 3);
  
  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-success/10 text-success border-success/30">Concluída</Badge>;
    }
    return <Badge className="bg-primary/10 text-primary border-primary/30">Em Andamento</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl text-primary truncate">{companyName}</CardTitle>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
              <span>{audits.length} auditoria{audits.length !== 1 ? 's' : ''}</span>
              {inProgressAudits.length > 0 && (
                <span className="text-primary font-medium">
                  {inProgressAudits.length} em andamento
                </span>
              )}
            </div>
          </div>
          <Button 
            onClick={() => onStartNewAudit(companyId, companyName)}
            className="w-full sm:w-auto sm:min-w-[140px]"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Iniciar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Auditorias em Andamento */}
        {inProgressAudits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">Em Andamento</h4>
            {inProgressAudits.map((audit) => (
              <Card key={audit.id} className="p-3 bg-primary/5 hover:bg-primary/10 transition-colors border-primary/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{audit.location_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Continuar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Auditorias Concluídas Recentes */}
        {completedAudits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">Concluídas Recentemente</h4>
            {completedAudits.map((audit) => (
              <Card key={audit.id} className="p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{audit.location_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {audit.score !== null && (
                          <>
                            <span className="text-base sm:text-lg font-bold">{audit.score.toFixed(1)}</span>
                            <ScoreLevelIndicator level={getScoreLevel(audit.score)} showLabel={false} />
                          </>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(audit.status)}
                  </div>
                  <Button
                    onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Eye className="h-4 w-4 sm:mr-2" />
                    <span className="sm:inline hidden">Ver</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {audits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma auditoria realizada ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
}
