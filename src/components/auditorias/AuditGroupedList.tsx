import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Building2, ChevronDown, MapPin, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AuditGroupedData {
  company_id: string;
  company_name: string;
  environments: {
    environment_id: string;
    environment_name: string;
    locations: {
      location_id: string;
      location_name: string;
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
}

interface AuditGroupedListProps {
  groupedAudits: AuditGroupedData[];
  onAuditClick: (auditId: string) => void;
}

export function AuditGroupedList({ groupedAudits, onAuditClick }: AuditGroupedListProps) {
  const [openCompanies, setOpenCompanies] = useState<string[]>([]);
  const [openEnvironments, setOpenEnvironments] = useState<string[]>([]);

  const toggleCompany = (companyId: string) => {
    setOpenCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const toggleEnvironment = (envId: string) => {
    setOpenEnvironments(prev =>
      prev.includes(envId)
        ? prev.filter(id => id !== envId)
        : [...prev, envId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge variant="default" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Em Andamento
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-700 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Concluída
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const getScoreLevelBadge = (level: string | null) => {
    if (!level) return null;
    const config = {
      low: { label: 'Baixo', className: 'bg-red-100 text-red-800 border-red-300' },
      medium: { label: 'Médio', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      high: { label: 'Alto', className: 'bg-green-100 text-green-800 border-green-300' }
    };
    const { label, className } = config[level as keyof typeof config] || config.medium;
    return <Badge variant="outline" className={cn(className, "text-xs")}>{label}</Badge>;
  };

  if (groupedAudits.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Nenhuma auditoria encontrada</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupedAudits.map((company) => (
        <Card key={company.company_id} className="overflow-hidden">
          <Collapsible
            open={openCompanies.includes(company.company_id)}
            onOpenChange={() => toggleCompany(company.company_id)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">{company.company_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {company.environments.reduce((acc, env) => 
                      acc + env.locations.reduce((locAcc, loc) => locAcc + loc.audits.length, 0), 0
                    )} auditorias
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    openCompanies.includes(company.company_id) && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                {company.environments.map((environment) => (
                  <div key={environment.environment_id} className="ml-4 border-l-2 border-primary/20 pl-4">
                    <Collapsible
                      open={openEnvironments.includes(environment.environment_id)}
                      onOpenChange={() => toggleEnvironment(environment.environment_id)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between py-2 hover:bg-muted/30 px-3 rounded-md transition-colors">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-medium">{environment.environment_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {environment.locations.reduce((acc, loc) => acc + loc.audits.length, 0)} auditorias
                            </Badge>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              openEnvironments.includes(environment.environment_id) && "rotate-180"
                            )}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="mt-2 space-y-2">
                          {environment.locations.map((location) => (
                            <div key={location.location_id} className="ml-4 space-y-2">
                              <div className="flex items-center gap-2 py-1">
                                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs">📍</span>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {location.location_name}
                                </span>
                              </div>
                              
                              <div className="ml-8 space-y-2">
                                {location.audits.map((audit) => (
                                  <div
                                    key={audit.id}
                                    className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer"
                                    onClick={() => onAuditClick(audit.id)}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {getStatusBadge(audit.status)}
                                          {audit.score_level && getScoreLevelBadge(audit.score_level)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          Auditor: {audit.auditor_name || 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                      </div>
                                      {audit.score !== null && (
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-xl font-bold">{audit.score.toFixed(1)}%</p>
                                          <p className="text-xs text-muted-foreground">Score</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
