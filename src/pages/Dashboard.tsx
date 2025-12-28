import { Link } from "react-router-dom";
import { Building2, BookOpen, Users, ClipboardList, TrendingUp, Activity, Trash2, Loader2, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: 'company' | 'criteria' | 'model' | 'audit';
  action: string;
  name: string;
  timestamp: string;
  color: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalCriteria: 0,
    activeCriteria: 0,
    inactiveCriteria: 0,
    totalModels: 0,
    activeModels: 0,
    totalUsers: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
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
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch companies from Supabase
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, status');
        
        if (companiesError) throw companiesError;

        // Fetch criteria from Supabase
        const { data: criteria, error: criteriaError } = await supabase
          .from('master_criteria')
          .select('id, status');
        
        if (criteriaError) throw criteriaError;

        // Fetch models from Supabase
        const { data: models, error: modelsError } = await supabase
          .from('master_models')
          .select('id, status');
        
        if (modelsError) throw modelsError;

        // Fetch user count from profiles
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Calculate stats
        const activeCompanies = companies?.filter(c => c.status === 'active').length || 0;
        const activeCriteria = criteria?.filter(c => c.status === 'active').length || 0;
        const activeModels = models?.filter(m => m.status === 'active').length || 0;

        setStats({
          totalCompanies: companies?.length || 0,
          activeCompanies,
          inactiveCompanies: (companies?.length || 0) - activeCompanies,
          totalCriteria: criteria?.length || 0,
          activeCriteria,
          inactiveCriteria: (criteria?.length || 0) - activeCriteria,
          totalModels: models?.length || 0,
          activeModels,
          totalUsers: usersCount || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Erro ao carregar estatísticas');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const allActivities: ActivityItem[] = [];

        // Fetch recent companies
        const { data: recentCompanies } = await supabase
          .from('companies')
          .select('id, name, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        recentCompanies?.forEach(company => {
          const isNew = company.created_at === company.updated_at;
          allActivities.push({
            id: `company-${company.id}`,
            type: 'company',
            action: isNew ? 'Nova empresa cadastrada' : 'Empresa atualizada',
            name: company.name,
            timestamp: company.updated_at,
            color: 'bg-green-500'
          });
        });

        // Fetch recent criteria
        const { data: recentCriteria } = await supabase
          .from('master_criteria')
          .select('id, name, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        recentCriteria?.forEach(criterion => {
          const isNew = criterion.created_at === criterion.updated_at;
          allActivities.push({
            id: `criteria-${criterion.id}`,
            type: 'criteria',
            action: isNew ? 'Critério criado' : 'Critério atualizado',
            name: criterion.name,
            timestamp: criterion.updated_at,
            color: 'bg-blue-500'
          });
        });

        // Fetch recent models
        const { data: recentModels } = await supabase
          .from('master_models')
          .select('id, name, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        recentModels?.forEach(model => {
          const isNew = model.created_at === model.updated_at;
          allActivities.push({
            id: `model-${model.id}`,
            type: 'model',
            action: isNew ? 'Modelo criado' : 'Modelo atualizado',
            name: model.name,
            timestamp: model.updated_at,
            color: 'bg-purple-500'
          });
        });

        // Fetch recent audits
        const { data: recentAudits } = await supabase
          .from('audits')
          .select(`
            id, 
            status, 
            created_at, 
            completed_at,
            environments!audits_location_id_fkey(name),
            companies!audits_company_id_fkey(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        recentAudits?.forEach(audit => {
          const envName = (audit.environments as any)?.name || 'Ambiente';
          const companyName = (audit.companies as any)?.name || 'Empresa';
          allActivities.push({
            id: `audit-${audit.id}`,
            type: 'audit',
            action: audit.status === 'completed' ? 'Auditoria concluída' : 'Auditoria iniciada',
            name: `${envName} - ${companyName}`,
            timestamp: audit.completed_at || audit.created_at,
            color: audit.status === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'
          });
        });

        // Sort all activities by timestamp
        allActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Take the 10 most recent
        setActivities(allActivities.slice(0, 10));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    fetchStats();
    fetchActivities();
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
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalCompanies}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeCompanies} ativas, {stats.inactiveCompanies} inativas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critérios Mestre</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalCriteria}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeCriteria} ativos, {stats.inactiveCriteria} inativos
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Mestre</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalModels}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeModels} ativos
                  </p>
                </>
              )}
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
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade registrada ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 text-sm">
                    <div className={`w-2 h-2 mt-2 rounded-full ${activity.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-muted-foreground truncate">
                        {activity.name} - {formatDistanceToNow(new Date(activity.timestamp), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
