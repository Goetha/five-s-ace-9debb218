import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import type { Audit } from "@/types/audit";
import { useNavigate } from "react-router-dom";

interface AuditWithLocation extends Audit {
  location_name: string;
  company_name: string;
}

interface AuditorCompanyCardProps {
  companyId: string;
  companyName: string;
  audits: AuditWithLocation[];
  onStartNewAudit: (companyId: string, companyName: string) => void;
}

export function AuditorCompanyCard({ companyId, companyName, audits, onStartNewAudit }: AuditorCompanyCardProps) {
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
      <CardHeader className="pb-3 p-3 sm:p-6">
        <div className="flex flex-col gap-2.5">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg text-primary truncate">{companyName}</CardTitle>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-1.5 text-xs text-muted-foreground">
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
            className="w-full text-xs sm:text-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Iniciar Nova Auditoria
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 p-3 sm:p-6">
        {/* Auditorias em Andamento */}
        {inProgressAudits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">Em Andamento</h4>
            {inProgressAudits.map((audit) => (
              <Card key={audit.id} className="p-2.5 sm:p-3 bg-primary/5 hover:bg-primary/10 transition-colors border-primary/20">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{audit.location_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}
                    size="sm"
                    className="w-full text-xs"
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
              <Card key={audit.id} className="p-2.5 sm:p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-xs sm:text-sm truncate flex-1 min-w-0">{audit.location_name}</p>
                        {getStatusBadge(audit.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {audit.score !== null && (
                          <>
                            <span className="text-sm sm:text-base font-bold">{audit.score.toFixed(1)}</span>
                            <ScoreLevelIndicator level={getScoreLevel(audit.score)} showLabel={false} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                  >
                    <Eye className="h-3 w-3 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {audits.length === 0 && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            Nenhuma auditoria realizada ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
}
