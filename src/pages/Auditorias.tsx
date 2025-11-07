import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NewAuditDialog } from "@/components/auditorias/NewAuditDialog";
import { AuditGroupedList } from "@/components/auditorias/AuditGroupedList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
interface Company {
  id: string;
  name: string;
}

interface AuditGroupedData {
  company_id: string;
  company_name: string;
  environments: {
    environment_id: string;
    environment_name: string;
    locations: {
      location_id: string;
      location_name: string;
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
  const [filteredGroupedAudits, setFilteredGroupedAudits] = useState<AuditGroupedData[]>([]);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewAuditDialogOpen, setIsNewAuditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Filtros
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  useEffect(() => {
    if (userRole === 'ifa_admin') {
      fetchData();
    }
  }, [userRole]);
  useEffect(() => {
    applyFilters();
  }, [groupedAudits, filterCompany, filterStatus]);
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

      // Buscar auditorias com hierarquia completa
      const { data: auditsData, error: auditsError } = await supabase
        .from('audits')
        .select(`
          *,
          companies!audits_company_id_fkey(id, name),
          environments!audits_location_id_fkey(
            id,
            name,
            parent:environments!environments_parent_id_fkey(
              id,
              name
            )
          ),
          profiles!audits_auditor_id_fkey(full_name)
        `)
        .order('started_at', { ascending: false });

      if (auditsError) throw auditsError;

      // Processar dados em estrutura hierárquica
      const grouped: { [key: string]: AuditGroupedData } = {};
      let total = 0;
      let completed = 0;
      let inProgress = 0;
      const scheduled: ScheduledAudit[] = [];

      (auditsData || []).forEach((audit: any) => {
        total++;
        if (audit.status === 'completed') completed++;
        if (audit.status === 'in_progress') inProgress++;

        // Auditorias agendadas
        if (audit.status === 'completed' && audit.next_audit_date && new Date(audit.next_audit_date) > new Date()) {
          scheduled.push({
            id: audit.id,
            company_name: audit.companies?.name || 'N/A',
            location_name: audit.environments?.name || 'N/A',
            environment_name: audit.environments?.parent?.name || 'N/A',
            auditor_name: audit.profiles?.full_name || 'N/A',
            next_audit_date: audit.next_audit_date
          });
        }

        const companyId = audit.company_id;
        const companyName = audit.companies?.name || 'Sem nome';
        const environmentId = audit.environments?.parent?.id || 'root';
        const environmentName = audit.environments?.parent?.name || 'Sem ambiente';
        const locationId = audit.location_id;
        const locationName = audit.environments?.name || 'Sem local';

        if (!grouped[companyId]) {
          grouped[companyId] = {
            company_id: companyId,
            company_name: companyName,
            environments: []
          };
        }

        let environment = grouped[companyId].environments.find(e => e.environment_id === environmentId);
        if (!environment) {
          environment = {
            environment_id: environmentId,
            environment_name: environmentName,
            locations: []
          };
          grouped[companyId].environments.push(environment);
        }

        let location = environment.locations.find(l => l.location_id === locationId);
        if (!location) {
          location = {
            location_id: locationId,
            location_name: locationName,
            audits: []
          };
          environment.locations.push(location);
        }

        location.audits.push({
          id: audit.id,
          status: audit.status,
          score: audit.score,
          score_level: audit.score_level,
          started_at: audit.started_at,
          auditor_name: audit.profiles?.full_name
        });
      });

      const groupedArray = Object.values(grouped);
      setGroupedAudits(groupedArray);
      setFilteredGroupedAudits(groupedArray);
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
  const applyFilters = () => {
    let filtered = [...groupedAudits];
    
    if (filterCompany !== "all") {
      filtered = filtered.filter(group => group.company_id === filterCompany);
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.map(group => ({
        ...group,
        environments: group.environments.map(env => ({
          ...env,
          locations: env.locations.map(loc => ({
            ...loc,
            audits: loc.audits.filter(audit => audit.status === filterStatus)
          })).filter(loc => loc.audits.length > 0)
        })).filter(env => env.locations.length > 0)
      })).filter(group => group.environments.length > 0);
    }
    
    setFilteredGroupedAudits(filtered);
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
    color: "text-purple-600"
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
      <main className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Auditorias</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie todas as auditorias realizadas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
          const Icon = stat.icon;
          return <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </Card>;
        })}
        </div>

        {/* Auditorias Agendadas */}
        {scheduledAudits.length > 0 && <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Próximas Auditorias Agendadas
            </h2>
            <div className="space-y-3">
              {scheduledAudits.map(audit => <div key={audit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50/50 gap-2">
                  <div>
                    <p className="font-medium">{audit.company_name}</p>
                    <p className="text-sm text-muted-foreground">{audit.environment_name} • {audit.location_name}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium text-purple-700">
                      {format(new Date(audit.next_audit_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">Auditor: {audit.auditor_name}</p>
                  </div>
                </div>)}
            </div>
          </Card>}

        {/* Filtros e Lista de Auditorias */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map(company => <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista Hierárquica de Auditorias */}
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando auditorias...</p>
            ) : (
              <AuditGroupedList
                groupedAudits={filteredGroupedAudits}
                onAuditClick={(auditId) => navigate(`/auditor/auditoria/${auditId}`)}
              />
            )}
          </div>
        </Card>

        {/* Nova Auditoria por Empresa */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Iniciar Nova Auditoria</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map(company => <Button key={company.id} variant="outline" className="justify-start h-auto p-4" onClick={() => handleNewAudit(company)}>
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{company.name}</span>
              </Button>)}
          </div>
        </Card>
      </main>

      {/* Dialog Nova Auditoria */}
      {selectedCompany && <NewAuditDialog open={isNewAuditDialogOpen} onOpenChange={setIsNewAuditDialogOpen} preSelectedCompanyId={selectedCompany.id} preSelectedCompanyName={selectedCompany.name} />}
    </div>;
};
export default Auditorias;