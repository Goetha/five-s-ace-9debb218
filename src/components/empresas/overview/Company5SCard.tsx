import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ClipboardList, 
  CheckSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Tag
} from "lucide-react";
import { Company } from "@/types/company";
import { MasterModel } from "@/types/model";

interface Company5SCardProps {
  company: Company;
  models: MasterModel[];
}

export const Company5SCard = ({ company, models }: Company5SCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fiveS = company.fiveSData;

  if (!fiveS) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{company.name}</h3>
                <p className="text-sm text-muted-foreground">ID: {company.id}</p>
              </div>
            </div>
            <Badge variant={company.status === "active" ? "default" : "secondary"}>
              {company.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Nenhum dado de 5S disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return { text: "text-green-600", bg: "bg-green-600", light: "bg-green-50" };
    if (score >= 7) return { text: "text-blue-600", bg: "bg-blue-600", light: "bg-blue-50" };
    if (score >= 4) return { text: "text-orange-600", bg: "bg-orange-600", light: "bg-orange-50" };
    return { text: "text-red-600", bg: "bg-red-600", light: "bg-red-50" };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Excelente";
    if (score >= 7) return "Bom";
    if (score >= 4) return "Precisa Melhorar";
    return "Crítico";
  };

  const getTrendIcon = () => {
    if (fiveS.compliance_trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (fiveS.compliance_trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendLabel = () => {
    if (fiveS.compliance_trend === "improving") return "Melhorando";
    if (fiveS.compliance_trend === "declining") return "Declinando";
    return "Estável";
  };

  const scoreColors = getScoreColor(fiveS.average_5s_score);
  const linkedModelNames = models.filter(m => fiveS.linked_models.includes(m.id)).map(m => m.name);

  const sensoColors = {
    "1S": "bg-red-500",
    "2S": "bg-orange-500",
    "3S": "bg-yellow-500",
    "4S": "bg-green-500",
    "5S": "bg-blue-500",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{company.name}</h3>
              <p className="text-sm text-muted-foreground">ID: {company.id}</p>
            </div>
          </div>
          <Badge variant={company.status === "active" ? "default" : "secondary"}>
            {company.status === "active" ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Modelos Vinculados */}
        {linkedModelNames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Modelos Vinculados</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {linkedModelNames.map((name, idx) => (
                <Badge key={idx} variant="outline">{name}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Score Geral 5S */}
        <div className={`p-4 rounded-lg ${scoreColors.light}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Score 5S Geral</span>
            <span className={`text-2xl font-bold ${scoreColors.text}`}>
              {fiveS.average_5s_score.toFixed(1)}/10
            </span>
          </div>
          <Progress value={fiveS.average_5s_score * 10} className="h-2 mb-2" indicatorClassName={scoreColors.bg} />
          <span className={`text-xs font-medium ${scoreColors.text}`}>{getScoreLabel(fiveS.average_5s_score)}</span>
        </div>

        {/* Scores por Senso */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-muted-foreground">Scores por Senso</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(fiveS.scores_by_senso).map(([senso, score]) => (
              <div key={senso} className="text-center">
                <div className={`h-2 rounded-full ${sensoColors[senso as keyof typeof sensoColors]} mb-1`} />
                <p className="text-xs font-medium">{senso}</p>
                <p className="text-sm font-bold">{score.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo de Auditorias e PAs */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Auditorias</p>
              <p className="text-sm font-medium">
                {fiveS.completed_audits}/{fiveS.total_audits}
                {fiveS.pending_audits > 0 && (
                  <span className="text-orange-600 ml-1">({fiveS.pending_audits} pendentes)</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Planos de Ação</p>
              <p className="text-sm font-medium">
                {fiveS.action_plans.open} abertos
                {fiveS.action_plans.overdue > 0 && (
                  <span className="text-red-600 ml-1">({fiveS.action_plans.overdue} atrasados)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Última Auditoria e Tendência */}
        {fiveS.last_audit_date && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Última auditoria: {new Date(fiveS.last_audit_date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="text-xs font-medium">{getTrendLabel()}</span>
            </div>
          </div>
        )}

        {/* Botão Expandir */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Menos detalhes
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Mais detalhes
            </>
          )}
        </Button>

        {/* Detalhes Expandidos */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t animate-fade-in">
            <div>
              <h4 className="text-sm font-semibold mb-2">Detalhamento dos Planos de Ação</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{fiveS.action_plans.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Abertos:</span>
                  <span className="font-medium text-orange-600">{fiveS.action_plans.open}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Em andamento:</span>
                  <span className="font-medium text-blue-600">{fiveS.action_plans.in_progress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fechados:</span>
                  <span className="font-medium text-green-600">{fiveS.action_plans.closed}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
