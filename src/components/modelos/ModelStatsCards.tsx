import { Package, CheckCircle, Clipboard, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MasterModel } from "@/types/model";

interface ModelStatsCardsProps {
  models: MasterModel[];
}

const ModelStatsCards = ({ models }: ModelStatsCardsProps) => {
  const totalModels = models.length;
  const activeModels = models.filter((m) => m.status === "active").length;
  const totalCriteria = models.reduce((acc, m) => acc + m.total_criteria, 0);
  const avgCriteria = totalModels > 0 ? Math.round(totalCriteria / totalModels) : 0;
  const totalCompanies = models.reduce((acc, m) => acc + m.companies_using, 0);

  const stats = [
    {
      icon: Package,
      label: "Total de Modelos",
      value: totalModels,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: CheckCircle,
      label: "Modelos Ativos",
      value: activeModels,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      icon: Clipboard,
      label: "Critérios nos Modelos",
      value: totalCriteria,
      subtext: `Média: ${avgCriteria} critérios/modelo`,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      icon: Building,
      label: "Empresas Usando",
      value: totalCompanies,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className={stat.bgColor}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                )}
              </div>
              <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ModelStatsCards;
