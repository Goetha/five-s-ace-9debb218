import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NewAuditDialog } from "@/components/auditorias/NewAuditDialog";
import { CompanyAuditCard } from "@/components/auditorias/CompanyAuditCard";
import { CompanyBoardModal } from "@/components/auditorias/CompanyBoardModal";
import { ManageAuditsModal } from "@/components/auditorias/ManageAuditsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
interface Company {
  id: string;
  name: string;
}

interface AuditGroupedData {
  company_id: string;
  company_name: string;
  areas: {
    area_id: string;
    area_name: string;
    environments: {
      environment_id: string;
      environment_name: string;
      locals: {
        local_id: string;
        local_name: string;
        audits: {
          id: string;
          status: string;
          score: number | null;
          score_level: string | null;
          started_at: string;
          auditor_name?: string;
        }[];
      }[];
    }[];
  }[];
}

interface ScheduledAudit {
  id: string;
  company_name: string;
  location_name: string;
  environment_name: string;
  auditor_name: string;
  next_audit_date: string;
}
const Auditorias = () => {
  const {
    userRole
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groupedAudits, setGroupedAudits] = useState<AuditGroupedData[]>([]);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewAuditDialogOpen, setIsNewAuditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanyForBoard, setSelectedCompanyForBoard] = useState<AuditGroupedData | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isManageAuditsOpen, setIsManageAuditsOpen] = useState(false);
  useEffect(() => {
    if (userRole === 'ifa_admin') {
      fetchData();
    }
  }, [userRole]);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Buscar auditorias (sem joins complexos)
      const { data: auditsData, error: auditsError } = await supabase
        .from('audits')
        .select('*')
        .order('started_at', { ascending: false });

      if (auditsError) throw auditsError;

      // Buscar dados relacionados em paralelo
      const [environmentsRes, profilesRes] = await Promise.all([
        supabase.from('environments').select('id, name, parent_id, company_id'),
        supabase.from('profiles').select('id, full_name')
      ]);

      if (environmentsRes.error) throw environmentsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const envs = environmentsRes.data || [];
      
      // Criar mapas para lookup rápido
      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);
      const envMap = new Map(envs.map(e => [e.id, e]));
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);

      // Índice de filhos por parent_id
      const childrenByParent = new Map<string, any[]>();
      for (const e of envs) {
        if (!e.parent_id) continue;
        const arr = childrenByParent.get(e.parent_id) || [];
        arr.push(e);
        childrenByParent.set(e.parent_id, arr);
      }

      // Raiz por empresa (parent_id null)
      const rootByCompany = new Map<string, any>();
      for (const e of envs) {
        if (e.parent_id === null && e.company_id) {
          rootByCompany.set(e.company_id, e);
        }
      }

      // Função para encontrar o nível 2 (filho direto do root) subindo na hierarquia
      const findSecondLevel = (envId: string): any | null => {
        let current = envMap.get(envId);
        if (!current) return null;
        
        // Subir até encontrar um nó cujo parent é o root (parent_id aponta para root)
        while (current) {
          if (!current.parent_id) return null; // Chegou ao root, não tem nível 2
          const parent = envMap.get(current.parent_id);
          if (!parent) return null;
          
          // Se o parent não tem parent (é o root), então current é nível 2
          if (!parent.parent_id) {
            return current;
          }
          
          // Continuar subindo
          current = parent;
        }
        return null;
      };

      // 1) Inicializar hierarquia completa por empresa (4 níveis: Empresa > Área > Ambiente > Local)
      const grouped: { [key: string]: AuditGroupedData } = {};
      
      for (const company of companiesData || []) {
        grouped[company.id] = {
          company_id: company.id,
          company_name: company.name,
          areas: []
        };

        const root = rootByCompany.get(company.id);
        if (!root) continue;
        
        // Nível 1: Áreas (filhos diretos do root)
        const areas = (childrenByParent.get(root.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        for (const area of areas) {
          const areaGroup = {
            area_id: area.id,
            area_name: area.name,
            environments: [] as any[]
          };
          
          // Nível 2: Ambientes (filhos das áreas)
          const environments = (childrenByParent.get(area.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
          
          for (const env of environments) {
            const envGroup = {
              environment_id: env.id,
              environment_name: env.name,
              locals: [] as any[]
            };
            
            // Nível 3: Locais (filhos dos ambientes)
            const locals = (childrenByParent.get(env.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
            
            for (const local of locals) {
              envGroup.locals.push({
                local_id: local.id,
                local_name: local.name,
                audits: []
              });
            }
            
            areaGroup.environments.push(envGroup);
          }
          
          grouped[company.id].areas.push(areaGroup);
        }
      }

      // Métricas
      let total = 0;
      let completed = 0;
      let inProgress = 0;
      const scheduled: ScheduledAudit[] = [];

      // 2) Preencher auditorias nas estruturas existentes  
      for (const audit of (auditsData || [])) {
        total++;
        if (audit.status === 'completed') completed++;
        if (audit.status === 'in_progress') inProgress++;

        const company = companiesMap.get(audit.company_id);
        const locationEnv = envMap.get(audit.location_id);
        const auditor = profilesMap.get(audit.auditor_id);

        // Encontrar o nível 2 (filho direto do root) para este location
        const secondLevelEnv = locationEnv ? findSecondLevel(locationEnv.id) : null;

        // Auditorias agendadas
        if (audit.status === 'completed' && audit.next_audit_date && new Date(audit.next_audit_date) > new Date()) {
          scheduled.push({
            id: audit.id,
            company_name: company?.name || 'N/A',
            location_name: locationEnv?.name || 'N/A',
            environment_name: secondLevelEnv?.name || 'N/A',
            auditor_name: auditor?.full_name || 'N/A',
            next_audit_date: audit.next_audit_date
          });
        }

        // Garantir que a empresa existe no grouped
        if (!grouped[audit.company_id]) {
          grouped[audit.company_id] = {
            company_id: audit.company_id,
            company_name: company?.name || 'Sem nome',
            areas: []
          };
        }

        const companyGroup = grouped[audit.company_id];

        // Encontrar onde a auditoria deve ser adicionada na hierarquia
        if (!locationEnv) continue;

        // Subir na hierarquia para encontrar: local -> ambiente -> área
        let currentEnv = locationEnv;
        let parentEnv = currentEnv.parent_id ? envMap.get(currentEnv.parent_id) : null;
        
        if (!parentEnv) continue;
        
        let grandparentEnv = parentEnv.parent_id ? envMap.get(parentEnv.parent_id) : null;
        
        if (!grandparentEnv) continue;
        
        // Verificar se grandparent é filho direto do root (área)
        // Para isso, o parent do grandparent deve ser o root (que não tem parent)
        const greatGrandparent = grandparentEnv.parent_id ? envMap.get(grandparentEnv.parent_id) : null;
        const isAreaLevel = greatGrandparent && !greatGrandparent.parent_id;

        if (isAreaLevel) {
          // grandparentEnv = Área, parentEnv = Ambiente, currentEnv = Local
          let areaGroup = companyGroup.areas.find(a => a.area_id === grandparentEnv!.id);
          if (!areaGroup) {
            areaGroup = {
              area_id: grandparentEnv.id,
              area_name: grandparentEnv.name,
              environments: []
            };
            companyGroup.areas.push(areaGroup);
          }

          let envGroup = areaGroup.environments.find(e => e.environment_id === parentEnv!.id);
          if (!envGroup) {
            envGroup = {
              environment_id: parentEnv!.id,
              environment_name: parentEnv!.name,
              locals: []
            };
            areaGroup.environments.push(envGroup);
          }

          let localGroup = envGroup.locals.find(l => l.local_id === currentEnv.id);
          if (!localGroup) {
            localGroup = {
              local_id: currentEnv.id,
              local_name: currentEnv.name,
              audits: []
            };
            envGroup.locals.push(localGroup);
          }

          localGroup.audits.push({
            id: audit.id,
            status: audit.status,
            score: audit.score,
            score_level: audit.score_level,
            started_at: audit.started_at,
            auditor_name: auditor?.full_name
          });
        }
      }

      const groupedArray = Object.values(grouped);
      setGroupedAudits(groupedArray);
      setScheduledAudits(scheduled);
      setTotalAudits(total);
      setCompletedCount(completed);
      setInProgressCount(inProgress);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenBoard = (companyData: AuditGroupedData) => {
    setSelectedCompanyForBoard(companyData);
    setIsBoardModalOpen(true);
  };
  
  const getCompanyStats = (company: AuditGroupedData) => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    
    company.areas.forEach(area => {
      area.environments.forEach(env => {
        env.locals.forEach(local => {
          local.audits.forEach(audit => {
            total++;
            if (audit.status === 'completed') completed++;
            if (audit.status === 'in_progress') inProgress++;
          });
        });
      });
    });
    
    return { total, completed, inProgress };
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />Em Andamento</Badge>;
      case 'completed':
        return <Badge variant="outline" className="gap-1 border-green-500 text-green-700"><CheckCircle2 className="h-3 w-3" />Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  const getScoreLevelBadge = (level: string | null) => {
    if (!level) return null;
    const config = {
      low: {
        label: 'Baixo',
        className: 'bg-red-100 text-red-800 border-red-300'
      },
      medium: {
        label: 'Médio',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      high: {
        label: 'Alto',
        className: 'bg-green-100 text-green-800 border-green-300'
      }
    };
    const {
      label,
      className
    } = config[level as keyof typeof config] || config.medium;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };
  const handleNewAudit = (company: Company) => {
    setSelectedCompany(company);
    setIsNewAuditDialogOpen(true);
  };
  const stats = [{
    label: "Total de Auditorias",
    value: totalAudits,
    icon: Calendar,
    color: "text-blue-600"
  }, {
    label: "Em Andamento",
    value: inProgressCount,
    icon: Clock,
    color: "text-orange-600"
  }, {
    label: "Concluídas",
    value: completedCount,
    icon: CheckCircle2,
    color: "text-green-600"
  }, {
    label: "Agendadas",
    value: scheduledAudits.length,
    icon: AlertCircle,
    color: "text-blue-600"
  }];
  if (userRole !== 'ifa_admin') {
    return <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-muted-foreground">Acesso não autorizado.</p>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Auditorias</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gerencie todas as auditorias realizadas
            </p>
          </div>
          {inProgressCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setIsManageAuditsOpen(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Gerenciar em Andamento
              <Badge variant="secondary" className="ml-1">{inProgressCount}</Badge>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((stat, index) => {
          const Icon = stat.icon;
          return <Card key={index} className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 ${stat.color}`} />
                </div>
              </Card>;
        })}
        </div>

        {/* Auditorias Agendadas */}
        {scheduledAudits.length > 0 && <Card className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Próximas Auditorias Agendadas
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {scheduledAudits.map(audit => <div key={audit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 border border-blue-200 rounded-lg bg-blue-50/50 gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{audit.company_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{audit.environment_name} • {audit.location_name}</p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-700">
                      {format(new Date(audit.next_audit_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">Auditor: {audit.auditor_name}</p>
                  </div>
                </div>)}
            </div>
          </Card>}

        {/* Cards das Empresas */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold">Empresas</h2>
          {isLoading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </Card>
          ) : groupedAudits.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Nenhuma empresa encontrada</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedAudits.map((company) => {
                const stats = getCompanyStats(company);
                return (
                  <CompanyAuditCard
                    key={company.company_id}
                    companyId={company.company_id}
                    companyName={company.company_name}
                    totalAudits={stats.total}
                    completedAudits={stats.completed}
                    inProgressAudits={stats.inProgress}
                    onClick={() => handleOpenBoard(company)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Nova Auditoria por Empresa */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Iniciar Nova Auditoria</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {companies.map(company => (
              <Button 
                key={company.id} 
                variant="outline" 
                className="justify-start h-auto p-3 sm:p-4 text-sm" 
                onClick={() => handleNewAudit(company)}
              >
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{company.name}</span>
              </Button>
            ))}
          </div>
        </Card>
      </main>

      {/* Modal Fullscreen do Quadro 5S */}
      <CompanyBoardModal
        open={isBoardModalOpen}
        onOpenChange={setIsBoardModalOpen}
        companyData={selectedCompanyForBoard}
        onAuditClick={(auditId) => navigate(`/auditor/auditoria/${auditId}`)}
      />

      {/* Dialog Nova Auditoria */}
      {selectedCompany && (
        <NewAuditDialog 
          open={isNewAuditDialogOpen} 
          onOpenChange={setIsNewAuditDialogOpen} 
          preSelectedCompanyId={selectedCompany.id} 
          preSelectedCompanyName={selectedCompany.name} 
        />
      )}

      {/* Modal Gerenciar Auditorias em Andamento */}
      <ManageAuditsModal
        open={isManageAuditsOpen}
        onOpenChange={setIsManageAuditsOpen}
        onAuditsDeleted={fetchData}
      />
    </div>;
};
export default Auditorias;