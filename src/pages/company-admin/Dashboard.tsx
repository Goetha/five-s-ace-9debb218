import { Building2, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { mockCompanyStats, currentCompanyAdmin } from "@/data/mockCompanyData";

export default function Dashboard() {
  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
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
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Ambientes
              </CardTitle>
              <Building2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {mockCompanyStats.totalEnvironments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Áreas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Usuários
              </CardTitle>
              <Users className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {mockCompanyStats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Colaboradores ativos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Auditorias
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {mockCompanyStats.totalAudits}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Score Médio
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {mockCompanyStats.averageScore}
                <span className="text-xl">/10</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Performance geral
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyAdminLayout>
  );
}
