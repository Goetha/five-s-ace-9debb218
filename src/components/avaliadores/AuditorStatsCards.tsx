import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users, Building2, Activity } from "lucide-react";
import { Auditor } from "@/types/auditor";

interface AuditorStatsCardsProps {
  auditors: Auditor[];
}

export function AuditorStatsCards({ auditors }: AuditorStatsCardsProps) {
  const totalAuditors = auditors.length;
  const activeAuditors = auditors.filter(a => a.status === 'active').length;
  const inactiveAuditors = auditors.filter(a => a.status === 'inactive').length;
  
  // Count unique companies
  const uniqueCompanies = new Set<string>();
  auditors.forEach(auditor => {
    auditor.linked_companies.forEach(company => {
      uniqueCompanies.add(company.id);
    });
  });
  const linkedCompaniesCount = uniqueCompanies.size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Avaliadores</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAuditors}</div>
          <p className="text-xs text-muted-foreground">
            Cadastrados no sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliadores Ativos</CardTitle>
          <Activity className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeAuditors}</div>
          <p className="text-xs text-muted-foreground">
            Com acesso ativo
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliadores Inativos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactiveAuditors}</div>
          <p className="text-xs text-muted-foreground">
            Sem acesso
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empresas Vinculadas</CardTitle>
          <Building2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{linkedCompaniesCount}</div>
          <p className="text-xs text-muted-foreground">
            Com avaliadores designados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
