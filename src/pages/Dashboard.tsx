import { Link } from "react-router-dom";
import { Building2, BookOpen, Users, ClipboardList, TrendingUp, Activity, Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Company } from "@/types/company";
import { Criteria } from "@/types/criteria";
import { MasterModel } from "@/types/model";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalCriteria: 0,
    activeCriteria: 0,
    inactiveCriteria: 0,
    totalModels: 0,
    totalUsers: 0,
  });
  const [isCleaningAuth, setIsCleaningAuth] = useState(false);

  const handleCleanupAuthUsers = async () => {
    setIsCleaningAuth(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-auth-users');
      
      if (error) throw error;
      
      toast.success('Limpeza concluída!', {
        description: `${data.deleted_count} usuários deletados do auth.users. ${data.failed_count} falhas.`
      });
      
      console.log('Cleanup result:', data);
    } catch (error) {
      console.error('Error cleaning up auth users:', error);
      toast.error('Erro ao limpar usuários', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsCleaningAuth(false);
    }
  };

  useEffect(() => {
    // Load companies
    const companiesData = localStorage.getItem("companies");
    const companies: Company[] = companiesData ? JSON.parse(companiesData) : [];
    
    // Load criteria
    const criteriaData = localStorage.getItem("criteria");
    const criteria: Criteria[] = criteriaData ? JSON.parse(criteriaData) : [];
    
    // Load models
    const modelsData = localStorage.getItem("models");
    const models: MasterModel[] = modelsData ? JSON.parse(modelsData) : [];

    // Calculate stats
    const activeCompanies = companies.filter(c => c.status === "active").length;
    const activeCriteria = criteria.filter(c => c.status === "Ativo").length;
    const totalUsers = companies.reduce((sum, c) => sum + (c.total_users || 0), 0);

    setStats({
      totalCompanies: companies.length,
      activeCompanies,
      inactiveCompanies: companies.length - activeCompanies,
      totalCriteria: criteria.length,
      activeCriteria,
      inactiveCriteria: criteria.length - activeCriteria,
      totalModels: models.length,
      totalUsers,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard IFA Admin
          </h1>
          <p className="text-muted-foreground">
            Visão geral do sistema 5S Manager
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCompanies} ativas, {stats.inactiveCompanies} inativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critérios Mestre</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCriteria}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCriteria} ativos, {stats.inactiveCriteria} inativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">IFA Admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Mestre</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalModels}</div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Cleanup Auth Users - Temporary */}
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-500">Limpeza de Autenticação (Temporário)</CardTitle>
            </div>
            <CardDescription>
              Deletar todos os usuários do auth.users exceto IFA Admin. Este botão é temporário para completar a limpeza do banco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCleanupAuthUsers}
              disabled={isCleaningAuth}
              variant="destructive"
              className="w-full"
            >
              {isCleaningAuth ? "Limpando..." : "Limpar Usuários Auth"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Gestão de Empresas</CardTitle>
              <CardDescription>
                Cadastre e gerencie empresas clientes e seus administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/empresas">
                <Button className="w-full">Gerenciar Empresas</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Modelos Mestre</CardTitle>
              <CardDescription>
                Crie e organize modelos de auditoria com grupos de critérios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/modelos-mestre">
                <Button className="w-full">Acessar Modelos</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Biblioteca de Critérios</CardTitle>
              <CardDescription>
                Gerencie a base de conhecimento 5S global com todos os critérios mestre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/criterios">
                <Button className="w-full">Acessar Biblioteca</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle>Gestão de Avaliadores</CardTitle>
              <CardDescription>
                Gerencie auditores e suas empresas vinculadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/avaliadores">
                <Button className="w-full">Gerenciar Avaliadores</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle>Relatórios Globais</CardTitle>
              <CardDescription>
                Visualize estatísticas e performance de todas as empresas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-red-500" />
              </div>
              <CardTitle>Usuários IFA</CardTitle>
              <CardDescription>
                Gerencie administradores e usuários internos da IFA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-cyan-500" />
              </div>
              <CardTitle>Logs do Sistema</CardTitle>
              <CardDescription>
                Monitore atividades e acessos em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="font-medium">Nova empresa cadastrada</p>
                  <p className="text-muted-foreground">Escritório Contábil Beta - há 2 horas</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">Critério atualizado</p>
                  <p className="text-muted-foreground">Organização de Ferramentas - há 4 horas</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">Modelo criado</p>
                  <p className="text-muted-foreground">5S Industrial Completo - há 1 dia</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
