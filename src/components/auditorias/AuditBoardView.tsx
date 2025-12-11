import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, ChevronRight, MapPin, Layers } from "lucide-react";
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
  hideCompanyHeader?: boolean;
}

// Configuração dos 5 Sensos com cores mais suaves no header
const SENSOS = [
  { key: '1S', name: 'Utilização', shortName: 'Util.', bgHeader: 'bg-red-500', textHeader: 'text-white' },
  { key: '2S', name: 'Organização', shortName: 'Org.', bgHeader: 'bg-orange-500', textHeader: 'text-white' },
  { key: '3S', name: 'Limpeza', shortName: 'Limp.', bgHeader: 'bg-yellow-500', textHeader: 'text-yellow-900' },
  { key: '4S', name: 'Saúde', shortName: 'Saúde', bgHeader: 'bg-emerald-500', textHeader: 'text-white' },
  { key: '5S', name: 'Autodisciplina', shortName: 'Disc.', bgHeader: 'bg-blue-500', textHeader: 'text-white' },
];

// Função para obter indicador visual baseado no score - agora com emojis de rostos
const getScoreIndicator = (score: number | null) => {
  if (score === null) return { 
    bg: 'bg-slate-100', 
    border: 'border-slate-200',
    textColor: 'text-slate-400',
    label: '-',
    description: '',
    emoji: '😶',
    hasScore: false
  };
  if (score >= 80) return { 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    label: `${score.toFixed(0)}%`,
    description: 'Excelente',
    emoji: '😃',
    hasScore: true
  };
  if (score >= 50) return { 
    bg: 'bg-amber-50', 
    border: 'border-amber-200',
    textColor: 'text-amber-700',
    label: `${score.toFixed(0)}%`,
    description: 'Atenção',
    emoji: '😐',
    hasScore: true
  };
  return { 
    bg: 'bg-red-50', 
    border: 'border-red-200',
    textColor: 'text-red-700',
    label: `${score.toFixed(0)}%`,
    description: 'Crítico',
    emoji: '😢',
    hasScore: true
  };
};

// Componente do indicador de score com emoji
const ScoreIndicator = ({ score, showPercent = false }: { score: number | null; showPercent?: boolean }) => {
  const indicator = getScoreIndicator(score);
  
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl sm:text-2xl">{indicator.emoji}</span>
      {indicator.hasScore && (
        <span className={cn("text-[8px] sm:text-[10px] font-semibold leading-tight", indicator.textColor)}>
          {showPercent ? indicator.label : indicator.description}
        </span>
      )}
    </div>
  );
};

export function AuditBoardView({ groupedAudits, onAuditClick, hideCompanyHeader = false }: AuditBoardViewProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>(
    hideCompanyHeader ? groupedAudits.map(c => c.company_id) : []
  );
  const [expandedAreas, setExpandedAreas] = useState<string[]>(
    hideCompanyHeader ? groupedAudits.flatMap(c => c.areas.map(a => a.area_id)) : []
  );
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
      {/* Legenda */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm">
          <span className="font-medium text-muted-foreground">Legenda:</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">😃</span>
            <span>≥ 80% (Excelente)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">😐</span>
            <span>50-79% (Atenção)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">😢</span>
            <span>&lt; 50% (Crítico)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">😶</span>
            <span>Não avaliado</span>
          </div>
        </div>
      </Card>

      {groupedAudits.map((company) => {
        const isExpanded = expandedCompanies.includes(company.company_id);
        const totalAudits = company.areas.reduce((acc, area) =>
          acc + area.environments.reduce((envAcc, env) =>
            envAcc + env.locals.reduce((locAcc, loc) => locAcc + loc.audits.length, 0), 0), 0
        );

        return (
          <Card key={company.company_id} className="overflow-hidden border-slate-200">
            {/* Cabeçalho da Empresa */}
            <div
              className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border-b"
              onClick={() => toggleCompany(company.company_id)}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Building2 className="h-5 w-5 text-slate-600 flex-shrink-0" />
                <span className="font-semibold text-sm sm:text-lg text-slate-800 truncate">{company.company_name}</span>
                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-slate-200 text-slate-600">
                  {totalAudits} auditorias
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0" />
              )}
            </div>

            {/* Quadro 5S */}
            {isExpanded && (
              <div className="relative animate-fade-in">
                {/* Indicador de scroll no mobile */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 sm:hidden" />
                
                <div className="overflow-x-auto bg-white scroll-smooth snap-x snap-mandatory scrollbar-hide touch-pan-x">
                  <table className="w-full min-w-[480px]">
                    {/* Cabeçalho com os 5 Sensos */}
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 text-left p-1.5 sm:p-3 bg-slate-50 min-w-[120px] sm:min-w-[200px] border-b border-r border-slate-200">
                          <span className="text-[10px] sm:text-sm font-semibold text-slate-600">
                            Ambiente / Local
                          </span>
                        </th>
                        {SENSOS.map((senso, idx) => (
                          <th 
                            key={senso.key} 
                            className={cn(
                              "p-1 sm:p-3 text-center border-b min-w-[50px] sm:min-w-[70px]",
                              senso.bgHeader, 
                              senso.textHeader,
                              idx === 0 && "rounded-tl-none",
                              idx === SENSOS.length - 1 && "border-r border-slate-200"
                            )}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] sm:text-sm font-bold">{senso.key}</span>
                              <span className="text-[8px] sm:text-xs opacity-90 hidden sm:block">{senso.name}</span>
                            </div>
                          </th>
                        ))}
                        <th className="p-1 sm:p-3 text-center bg-slate-600 text-white border-b min-w-[50px] sm:min-w-[70px]">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-sm font-bold">GERAL</span>
                            <span className="text-[8px] sm:text-xs opacity-90 hidden sm:block">Média</span>
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
                            className="border-b border-amber-200 bg-amber-100 cursor-pointer hover:bg-amber-200 transition-colors"
                            onClick={() => toggleArea(area.area_id)}
                          >
                            <td className="sticky left-0 z-10 p-1.5 sm:p-3 border-r border-amber-200 bg-amber-100">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                {isAreaExpanded ? (
                                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                )}
                                <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                <span className="font-medium text-[10px] sm:text-sm text-amber-900 truncate">{area.area_name}</span>
                              </div>
                            </td>
                            {/* Células vazias para área */}
                            {SENSOS.map((senso) => (
                              <td key={senso.key} className="p-1.5 sm:p-2 text-center border-r border-amber-200 last:border-r-0 bg-amber-50">
                                <span className="text-amber-300 text-xs">—</span>
                              </td>
                            ))}
                            <td className="p-1.5 sm:p-2 text-center bg-amber-50">
                              <span className="text-amber-300 text-xs">—</span>
                            </td>
                          </tr>

                          {/* Ambientes e Locais */}
                          {isAreaExpanded && area.environments.map((env) => (
                            <>
                              {/* Linha do Ambiente */}
                              <tr key={env.environment_id} className="border-b border-emerald-200 bg-emerald-100">
                                <td className="sticky left-0 z-10 p-1.5 sm:p-3 pl-4 sm:pl-10 border-r border-emerald-200 bg-emerald-100">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-sm font-medium text-emerald-800 truncate">{env.environment_name}</span>
                                  </div>
                                </td>
                                {SENSOS.map((senso) => (
                                  <td key={senso.key} className="p-1.5 sm:p-2 text-center border-r border-emerald-200 last:border-r-0 bg-emerald-50">
                                    <span className="text-emerald-300 text-xs">—</span>
                                  </td>
                                ))}
                                <td className="p-1.5 sm:p-2 text-center bg-emerald-50">
                                  <span className="text-emerald-300 text-xs">—</span>
                                </td>
                              </tr>

                              {/* Linhas dos Locais */}
                              {env.locals.map((local) => {
                                const latestAudit = getLatestAudit(local.audits);
                                const localScore = latestAudit?.score ?? null;

                                return (
                                  <tr 
                                    key={local.local_id} 
                                    className={cn(
                                      "border-b border-blue-100 bg-blue-50/50 hover:bg-blue-100/50 transition-colors",
                                      latestAudit && "cursor-pointer"
                                    )}
                                    onClick={() => latestAudit && onAuditClick(latestAudit.id)}
                                  >
                                    <td className="sticky left-0 z-10 p-1.5 sm:p-3 pl-6 sm:pl-16 border-r border-blue-100 bg-blue-50/50">
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 flex-shrink-0" />
                                        <span className="text-[10px] sm:text-sm font-medium text-blue-800 truncate">{local.local_name}</span>
                                        {local.audits.length > 0 && (
                                          <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-blue-50 text-blue-600 border-blue-200 flex-shrink-0 px-1">
                                            {local.audits.length}
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    {/* Para cada Senso */}
                                    {SENSOS.map((senso) => (
                                      <td key={senso.key} className="p-1 sm:p-2 text-center border-r border-blue-100 last:border-r-0 bg-white">
                                        <div className="flex justify-center">
                                          <ScoreIndicator score={localScore} />
                                        </div>
                                      </td>
                                    ))}
                                    {/* Coluna GERAL */}
                                    <td className="p-1 sm:p-2 text-center bg-white">
                                      <div className="flex justify-center">
                                        <ScoreIndicator score={localScore} showPercent />
                                      </div>
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
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
