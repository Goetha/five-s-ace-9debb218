import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle2, Target, ClipboardList } from "lucide-react";
import { Company } from "@/types/company";

interface OverviewStatsCardsProps {
  companies: Company[];
}

export const OverviewStatsCards = ({ companies }: OverviewStatsCardsProps) => {
  const activeCompanies = companies.filter((c) => c.status === "active");
  const companiesWithModels = companies.filter(
    (c) => c.fiveSData && c.fiveSData.linked_models.length > 0
  );
  
  const averageScore = companies.length > 0
    ? companies.reduce((acc, c) => acc + (c.fiveSData?.average_5s_score || 0), 0) / companies.length
    : 0;
  
  const totalAudits = companies.reduce((acc, c) => acc + (c.fiveSData?.completed_audits || 0), 0);
  const totalOpenPA = companies.reduce((acc, c) => acc + (c.fiveSData?.action_plans.open || 0), 0);

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-600";
    if (score >= 7) return "text-blue-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const stats = [
    {
      label: "Empresas Ativas",
      value: activeCompanies.length,
      total: companies.length,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Com Modelos Vinculados",
      value: companiesWithModels.length,
      total: companies.length,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Score Médio Geral",
      value: averageScore.toFixed(1),
      suffix: "/10",
      icon: Target,
      color: getScoreColor(averageScore),
      bgColor: "bg-blue-50",
    },
    {
      label: "Auditorias Concluídas",
      value: totalAudits,
      icon: ClipboardList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Planos de Ação Abertos",
      value: totalOpenPA,
      icon: ClipboardList,
      color: totalOpenPA > 0 ? "text-orange-600" : "text-gray-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {stat.value}
                  {stat.suffix && <span className="text-lg text-muted-foreground">{stat.suffix}</span>}
                  {stat.total !== undefined && (
                    <span className="text-lg text-muted-foreground">/{stat.total}</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
