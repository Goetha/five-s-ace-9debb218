import { Building, CheckCircle, Circle, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Company } from "@/types/company";

interface CompanyStatsCardsProps {
  companies: Company[];
}

export function CompanyStatsCards({ companies }: CompanyStatsCardsProps) {
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const inactiveCompanies = companies.filter(c => c.status === 'inactive').length;
  const totalUsers = companies.reduce((sum, c) => sum + c.total_users, 0);

  const stats = [
    {
      label: "Total de Empresas",
      value: totalCompanies,
      icon: Building,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Empresas Ativas",
      value: activeCompanies,
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Empresas Inativas",
      value: inactiveCompanies,
      icon: Circle,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
    },
    {
      label: "Total de Usuários",
      value: totalUsers,
      icon: Users,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      subtext: "Todas as empresas",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`${stat.bgColor} border-0 p-6 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                )}
              </div>
              <div className={`${stat.iconColor} p-3 rounded-lg bg-white/50`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
