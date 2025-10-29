import { Building2, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { mockCompanyStats, currentCompanyAdmin } from "@/data/mockCompanyData";

export default function Dashboard() {
  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo, {currentCompanyAdmin.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie sua empresa no sistema 5S
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">
                Ambientes
              </CardTitle>
              <Building2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700">
                {mockCompanyStats.totalEnvironments}
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                Áreas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">
                Usuários
              </CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {mockCompanyStats.totalUsers}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Colaboradores ativos
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">
                Auditorias
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {mockCompanyStats.totalAudits}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">
                Score Médio
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">
                {mockCompanyStats.averageScore}
                <span className="text-xl">/10</span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Performance geral
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyAdminLayout>
  );
}
