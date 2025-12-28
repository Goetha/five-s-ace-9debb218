import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NewAuditDialog } from "@/components/auditorias/NewAuditDialog";
import { CompanyAuditCard } from "@/components/auditorias/CompanyAuditCard";
import { CompanyBoardModal } from "@/components/auditorias/CompanyBoardModal";
import { InProgressAuditsList, InProgressAudit } from "@/components/auditorias/InProgressAuditsList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { AuditGroupedData, AuditWithSensoScores, SensoScores } from "@/components/auditorias/AuditBoardView";

interface Company {
  id: string;
  name: string;
}

interface ScheduledAudit {
  id: string;
  company_name: string;
  location_name: string;
  environment_name: string;
  auditor_name: string;
  next_audit_date: string;
}

// Calcula scores por senso baseado nos audit_items
// Se não há audit_items com senso, retorna o score geral em todos os sensos
function calculateSensoScores(
  auditItems: { answer: boolean | null; senso: string[] | null }[],
  generalScore: number | null
): SensoScores {
  const sensoData: Record<string, { conforme: number; total: number }> = {
    '1S': { conforme: 0, total: 0 },
    '2S': { conforme: 0, total: 0 },
    '3S': { conforme: 0, total: 0 },
    '4S': { conforme: 0, total: 0 },
    '5S': { conforme: 0, total: 0 },
  };

  let hasAnySensoData = false;

  for (const item of auditItems) {
    if (item.answer === null) continue;
    const sensos = item.senso || [];
    
    for (const s of sensos) {
      if (sensoData[s]) {
        sensoData[s].total++;
        hasAnySensoData = true;
        if (item.answer === true) {
          sensoData[s].conforme++;
        }
      }
    }
  }

  // Se não há dados de senso, usar o score geral em todos os sensos
  if (!hasAnySensoData && generalScore !== null) {
    return {
      score_1s: generalScore,
      score_2s: generalScore,
      score_3s: generalScore,
      score_4s: generalScore,
      score_5s: generalScore,
    };
  }

  const getScore = (key: string): number | null => {
    const data = sensoData[key];
    if (data.total === 0) return null;
    return (data.conforme / data.total) * 100;
  };

  return {
    score_1s: getScore('1S'),
    score_2s: getScore('2S'),
    score_3s: getScore('3S'),
    score_4s: getScore('4S'),
    score_5s: getScore('5S'),
  };
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
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groupedAudits, setGroupedAudits] = useState<AuditGroupedData[]>([]);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [inProgressAudits, setInProgressAudits] = useState<InProgressAudit[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isNewAuditDialogOpen, setIsNewAuditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanyForBoard, setSelectedCompanyForBoard] = useState<AuditGroupedData | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

  useEffect(() => {
    if (userRole === 'ifa_admin') {
      fetchData();
    }
  }, [userRole]);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Buscar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Buscar auditorias
      const { data: auditsData, error: auditsError } = await supabase
        .from('audits')
        .select('*')
        .order('started_at', { ascending: false });

      if (auditsError) throw auditsError;

      // Buscar dados relacionados em paralelo
      const [environmentsRes, profilesRes, auditItemsRes, companyCriteriaRes] = await Promise.all([
        supabase.from('environments').select('id, name, parent_id, company_id'),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('audit_items').select('audit_id, answer, criterion_id'),
        supabase.from('company_criteria').select('id, senso')
      ]);

      if (environmentsRes.error) throw environmentsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (auditItemsRes.error) throw auditItemsRes.error;
      if (companyCriteriaRes.error) throw companyCriteriaRes.error;

      const envs = environmentsRes.data || [];
      const auditItems = auditItemsRes.data || [];
      const companyCriteria = companyCriteriaRes.data || [];
      
      // Criar mapas para lookup rápido
      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);
      const envMap = new Map(envs.map(e => [e.id, e]));
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const criteriaMap = new Map(companyCriteria.map(c => [c.id, c]));

      // Agrupar audit_items por audit_id com senso de cada critério
      const auditItemsByAuditId = new Map<string, { answer: boolean | null; senso: string[] | null }[]>();
      
      for (const item of auditItems) {
        const criterion = criteriaMap.get(item.criterion_id);
        const senso = criterion?.senso || null;
        
        const currentItems = auditItemsByAuditId.get(item.audit_id) || [];
        currentItems.push({ answer: item.answer, senso });
        auditItemsByAuditId.set(item.audit_id, currentItems);
      }

      // Contar itens respondidos por auditoria
      const auditItemCounts = new Map<string, { answered: number; total: number }>();
      for (const item of auditItems) {
        const current = auditItemCounts.get(item.audit_id) || { answered: 0, total: 0 };
        current.total++;
        if (item.answer !== null) current.answered++;
        auditItemCounts.set(item.audit_id, current);
      }

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

      // Função para obter hierarquia completa de um location
      const getLocationHierarchy = (locationId: string) => {
        const location = envMap.get(locationId);
        if (!location) return null;
        
        const ambiente = location.parent_id ? envMap.get(location.parent_id) : null;
        const area = ambiente?.parent_id ? envMap.get(ambiente.parent_id) : null;
        
        return {
          local_name: location.name,
          environment_name: ambiente?.name || 'N/A',
          area_name: area?.name || 'N/A'
        };
      };

      // 1) Inicializar hierarquia por empresa
      const grouped: { [key: string]: AuditGroupedData } = {};
      
      for (const company of companiesData || []) {
        grouped[company.id] = {
          company_id: company.id,
          company_name: company.name,
          areas: []
        };

        const root = rootByCompany.get(company.id);
        if (!root) continue;
        
        const areas = (childrenByParent.get(root.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        for (const area of areas) {
          const areaGroup = {
            area_id: area.id,
            area_name: area.name,
            environments: [] as any[]
          };
          
          const environments = (childrenByParent.get(area.id) || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
          
          for (const env of environments) {
            const envGroup = {
              environment_id: env.id,
              environment_name: env.name,
              locals: [] as any[]
            };
            
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

      // Métricas e auditorias em andamento
      let total = 0;
      let completed = 0;
      let inProgress = 0;
      const scheduled: ScheduledAudit[] = [];
      const inProgressList: InProgressAudit[] = [];

      // 2) Preencher auditorias nas estruturas  
      for (const audit of (auditsData || [])) {
        total++;
        if (audit.status === 'completed') completed++;
        
        const company = companiesMap.get(audit.company_id);
        const locationEnv = envMap.get(audit.location_id);
        const auditor = profilesMap.get(audit.auditor_id);
        const hierarchy = getLocationHierarchy(audit.location_id);
        const itemCounts = auditItemCounts.get(audit.id) || { answered: 0, total: 0 };

        // Auditorias em andamento
        if (audit.status === 'in_progress') {
          inProgress++;
          inProgressList.push({
            id: audit.id,
            company_id: audit.company_id,
            company_name: company?.name || 'N/A',
            area_name: hierarchy?.area_name || 'N/A',
            environment_name: hierarchy?.environment_name || 'N/A',
            local_name: hierarchy?.local_name || 'N/A',
            started_at: audit.started_at || audit.created_at,
            answered_count: itemCounts.answered,
            total_count: itemCounts.total,
            partial_score: audit.score
          });
        }

        // Auditorias agendadas
        if (audit.status === 'completed' && audit.next_audit_date && new Date(audit.next_audit_date) > new Date()) {
          scheduled.push({
            id: audit.id,
            company_name: company?.name || 'N/A',
            location_name: locationEnv?.name || 'N/A',
            environment_name: hierarchy?.environment_name || 'N/A',
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

        let currentEnv = locationEnv;
        let parentEnv = currentEnv.parent_id ? envMap.get(currentEnv.parent_id) : null;
        if (!parentEnv) continue;
        
        let grandparentEnv = parentEnv.parent_id ? envMap.get(parentEnv.parent_id) : null;
        if (!grandparentEnv) continue;
        
        const greatGrandparent = grandparentEnv.parent_id ? envMap.get(grandparentEnv.parent_id) : null;
        const isAreaLevel = greatGrandparent && !greatGrandparent.parent_id;

        if (isAreaLevel) {
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

          // Calcular scores por senso
          const auditItemsForThisAudit = auditItemsByAuditId.get(audit.id) || [];
          const sensoScores = calculateSensoScores(auditItemsForThisAudit, audit.score);

          localGroup.audits.push({
            id: audit.id,
            status: audit.status,
            score: audit.score,
            score_level: audit.score_level,
            started_at: audit.started_at,
            auditor_name: auditor?.full_name,
            ...sensoScores
          });
        }
      }

      // Ordenar auditorias em andamento por data mais recente
      inProgressList.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

      setGroupedAudits(Object.values(grouped));
      setScheduledAudits(scheduled);
      setInProgressAudits(inProgressList);
      setTotalAudits(total);
      setCompletedCount(completed);
      setInProgressCount(inProgress);
    } catch (error: any) {
      console.error('Error fetching auditorias data:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao carregar dados';
      setLoadError(errorMessage);
      toast({
        title: "Erro ao carregar auditorias",
        description: errorMessage,
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

  const handleNewAudit = (company: Company) => {
    setSelectedCompany(company);
    setIsNewAuditDialogOpen(true);
  };

  const stats = [
    { label: "Total", value: totalAudits, icon: Calendar, color: "text-blue-600" },
    { label: "Em Andamento", value: inProgressCount, icon: Clock, color: "text-orange-600" },
    { label: "Concluídas", value: completedCount, icon: CheckCircle2, color: "text-green-600" },
    { label: "Agendadas", value: scheduledAudits.length, icon: AlertCircle, color: "text-blue-600" }
  ];

  if (userRole !== 'ifa_admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-muted-foreground">Acesso não autorizado.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Auditorias</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gerencie todas as auditorias 5S
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 ${stat.color}`} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* SEÇÃO 1: Continuar Auditorias em Andamento */}
        <InProgressAuditsList 
          audits={inProgressAudits}
          isLoading={isLoading}
          onAuditDeleted={fetchData}
        />

        {/* SEÇÃO 2: Iniciar Nova Auditoria */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Iniciar Nova Auditoria
          </h2>
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

        {/* SEÇÃO 3: Resultados 5S por Empresa */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Resultados 5S por Empresa
          </h2>
          {isLoading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </Card>
          ) : loadError ? (
            <Card className="p-6">
              <div className="text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-destructive font-medium">Erro ao carregar dados</p>
                <p className="text-sm text-muted-foreground">{loadError}</p>
                <Button onClick={fetchData} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
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

        {/* Auditorias Agendadas */}
        {scheduledAudits.length > 0 && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Próximas Auditorias Agendadas
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {scheduledAudits.map(audit => (
                <div key={audit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 border border-blue-200 rounded-lg bg-blue-50/50 gap-2">
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
                </div>
              ))}
            </div>
          </Card>
        )}
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
    </div>
  );
};

export default Auditorias;