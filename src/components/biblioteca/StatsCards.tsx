import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CheckCircle2, XCircle, Scale } from "lucide-react";
import { Criteria } from "@/types/criteria";

interface StatsCardsProps {
  criteria: Criteria[];
}

const StatsCards = ({ criteria }: StatsCardsProps) => {
  const totalCriteria = criteria.length;
  const activeCriteria = criteria.filter((c) => c.status === "Ativo").length;
  const inactiveCriteria = criteria.filter((c) => c.status === "Inativo").length;

  const stats = [
    {
      title: "Total de Critérios",
      value: totalCriteria,
      icon: BarChart3,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Critérios Ativos",
      value: activeCriteria,
      icon: CheckCircle2,
      iconColor: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Critérios Inativos",
      value: inactiveCriteria,
      icon: XCircle,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
