import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

interface AuditBoardViewProps {
  groupedAudits: AuditGroupedData[];
  onAuditClick: (auditId: string) => void;
}

// Configuração dos 5 Sensos
const SENSOS = [
  { key: '1S', name: 'Utilização', shortName: 'Util.', color: 'bg-red-500', textColor: 'text-white' },
  { key: '2S', name: 'Organização', shortName: 'Org.', color: 'bg-orange-500', textColor: 'text-white' },
  { key: '3S', name: 'Limpeza', shortName: 'Limp.', color: 'bg-yellow-500', textColor: 'text-black' },
  { key: '4S', name: 'Saúde', shortName: 'Saúde', color: 'bg-green-500', textColor: 'text-white' },
  { key: '5S', name: 'Autodisciplina', shortName: 'Disc.', color: 'bg-blue-500', textColor: 'text-white' },
];

// Função para obter indicador visual baseado no score
const getScoreIndicator = (score: number | null) => {
  if (score === null) return { emoji: '⚪', bg: 'bg-gray-100', text: '-' };
  if (score >= 80) return { emoji: '😊', bg: 'bg-green-100', text: `${score.toFixed(0)}%` };
  if (score >= 50) return { emoji: '😐', bg: 'bg-yellow-100', text: `${score.toFixed(0)}%` };
  return { emoji: '😟', bg: 'bg-red-100', text: `${score.toFixed(0)}%` };
};

export function AuditBoardView({ groupedAudits, onAuditClick }: AuditBoardViewProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  // Calcular score geral de um local baseado nas auditorias
  const getLocalScore = (audits: AuditGroupedData['areas'][0]['environments'][0]['locals'][0]['audits']) => {
    const completedAudits = audits.filter(a => a.status === 'completed' && a.score !== null);
    if (completedAudits.length === 0) return null;
    const avgScore = completedAudits.reduce((acc, a) => acc + (a.score || 0), 0) / completedAudits.length;
    return avgScore;
  };

  // Obter a última auditoria de um local
  const getLatestAudit = (audits: AuditGroupedData['areas'][0]['environments'][0]['locals'][0]['audits']) => {
    if (audits.length === 0) return null;
    return audits.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
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
      {groupedAudits.map((company) => {
        const isExpanded = expandedCompanies.includes(company.company_id);
        const totalAudits = company.areas.reduce((acc, area) =>
          acc + area.environments.reduce((envAcc, env) =>
            envAcc + env.locals.reduce((locAcc, loc) => locAcc + loc.audits.length, 0), 0), 0
        );

        return (
          <Card key={company.company_id} className="overflow-hidden">
            {/* Cabeçalho da Empresa */}
            <div
              className="flex items-center justify-between p-3 sm:p-4 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => toggleCompany(company.company_id)}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm sm:text-lg truncate">{company.company_name}</span>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {totalAudits} auditorias
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {/* Quadro 5S */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  {/* Cabeçalho com os 5 Sensos */}
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3 bg-muted/30 min-w-[150px] sm:min-w-[200px]">
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                          Ambiente / Local
                        </span>
                      </th>
                      {SENSOS.map((senso) => (
                        <th key={senso.key} className={cn("p-2 sm:p-3 text-center", senso.color, senso.textColor)}>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs font-bold">{senso.key}</span>
                            <span className="text-[9px] sm:text-xs hidden sm:block">{senso.name}</span>
                            <span className="text-[9px] sm:hidden">{senso.shortName}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 sm:p-3 text-center bg-gray-600 text-white">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] sm:text-xs font-bold">GERAL</span>
                          <span className="text-[9px] sm:text-xs hidden sm:block">Média</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.areas.map((area) => {
                      const isAreaExpanded = expandedAreas.includes(area.area_id);
                      
                      return (
                        <>
                          {/* Linha da Área */}
                          <tr 
                            key={area.area_id} 
                            className="border-b bg-orange-50/50 cursor-pointer hover:bg-orange-50 transition-colors"
                            onClick={() => toggleArea(area.area_id)}
                          >
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-2">
                                {isAreaExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-orange-600" />
                                )}
                                <Building2 className="h-4 w-4 text-orange-500" />
                                <span className="font-medium text-xs sm:text-sm">{area.area_name}</span>
                                <Badge variant="outline" className="text-[9px] bg-orange-100 text-orange-700 border-orange-300">
                                  Área
                                </Badge>
                              </div>
                            </td>
                            {/* Células vazias para área */}
                            {SENSOS.map((senso) => (
                              <td key={senso.key} className="p-2 text-center">
                                <span className="text-gray-300">-</span>
                              </td>
                            ))}
                            <td className="p-2 text-center">
                              <span className="text-gray-300">-</span>
                            </td>
                          </tr>

                          {/* Ambientes e Locais */}
                          {isAreaExpanded && area.environments.map((env) => (
                            <>
                              {/* Linha do Ambiente */}
                              <tr key={env.environment_id} className="border-b bg-green-50/30">
                                <td className="p-2 sm:p-3 pl-6 sm:pl-10">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-xs sm:text-sm text-muted-foreground">{env.environment_name}</span>
                                    <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-300">
                                      Ambiente
                                    </Badge>
                                  </div>
                                </td>
                                {SENSOS.map((senso) => (
                                  <td key={senso.key} className="p-2 text-center">
                                    <span className="text-gray-300">-</span>
                                  </td>
                                ))}
                                <td className="p-2 text-center">
                                  <span className="text-gray-300">-</span>
                                </td>
                              </tr>

                              {/* Linhas dos Locais */}
                              {env.locals.map((local) => {
                                const latestAudit = getLatestAudit(local.audits);
                                const localScore = latestAudit?.score ?? null;
                                const scoreIndicator = getScoreIndicator(localScore);

                                return (
                                  <tr 
                                    key={local.local_id} 
                                    className={cn(
                                      "border-b hover:bg-blue-50/50 transition-colors",
                                      latestAudit && "cursor-pointer"
                                    )}
                                    onClick={() => latestAudit && onAuditClick(latestAudit.id)}
                                  >
                                    <td className="p-2 sm:p-3 pl-10 sm:pl-16">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">📍</span>
                                        <span className="text-xs sm:text-sm font-medium">{local.local_name}</span>
                                        {local.audits.length > 0 && (
                                          <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-300">
                                            {local.audits.length} aud.
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    {/* Para cada Senso - Por enquanto mostramos o score geral dividido em cada senso */}
                                    {SENSOS.map((senso) => {
                                      // Aqui idealmente teríamos o score por senso
                                      // Por ora mostramos o mesmo indicador
                                      return (
                                        <td key={senso.key} className="p-2 text-center">
                                          {localScore !== null ? (
                                            <div className={cn("inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg", scoreIndicator.bg)}>
                                              <span className="text-base sm:text-xl">{scoreIndicator.emoji}</span>
                                            </div>
                                          ) : (
                                            <span className="text-gray-300">⚪</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    {/* Coluna GERAL */}
                                    <td className="p-2 text-center">
                                      {localScore !== null ? (
                                        <div className={cn("inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg", scoreIndicator.bg)}>
                                          <span className="text-base sm:text-lg">{scoreIndicator.emoji}</span>
                                          <span className="text-[10px] sm:text-xs font-bold">{scoreIndicator.text}</span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">N/A</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
