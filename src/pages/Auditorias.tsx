import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { NewAuditDialog } from "@/components/auditorias/NewAuditDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface Company {
  id: string;
  name: string;
}
interface Audit {
  id: string;
  company_id: string;
  location_id: string;
  auditor_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  score_level: string | null;
  next_audit_date: string | null;
  company_name?: string;
  location_name?: string;
  auditor_name?: string;
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
  const [audits, setAudits] = useState<Audit[]>([]);
  const [filteredAudits, setFilteredAudits] = useState<Audit[]>([]);
  const [scheduledAudits, setScheduledAudits] = useState<Audit[]>([]);
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
  }, [audits, filterCompany, filterStatus]);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar empresas
      const {
        data: companiesData,
        error: companiesError
      } = await supabase.from('companies').select('id, name').eq('status', 'active').order('name');
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Buscar todas as auditorias
      const {
        data: auditsData,
        error: auditsError
      } = await supabase.from('audits').select('*').order('started_at', {
        ascending: false
      });
      if (auditsError) throw auditsError;

      // Buscar nomes relacionados
      const formattedAudits = await Promise.all((auditsData || []).map(async audit => {
        const [companyRes, locationRes, profileRes] = await Promise.all([supabase.from('companies').select('name').eq('id', audit.company_id).single(), supabase.from('environments').select('name').eq('id', audit.location_id).single(), supabase.from('profiles').select('full_name').eq('id', audit.auditor_id).single()]);
        return {
          ...audit,
          company_name: companyRes.data?.name,
          location_name: locationRes.data?.name,
          auditor_name: profileRes.data?.full_name
        };
      }));
      setAudits(formattedAudits);

      // Filtrar auditorias agendadas (completed com next_audit_date no futuro)
      const scheduled = formattedAudits.filter(audit => audit.status === 'completed' && audit.next_audit_date && new Date(audit.next_audit_date) > new Date());
      setScheduledAudits(scheduled);
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
    let filtered = [...audits];
    if (filterCompany !== "all") {
      filtered = filtered.filter(audit => audit.company_id === filterCompany);
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter(audit => audit.status === filterStatus);
    }
    setFilteredAudits(filtered);
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
    value: audits.length,
    icon: Calendar,
    color: "text-blue-600"
  }, {
    label: "Em Andamento",
    value: audits.filter(a => a.status === 'in_progress').length,
    icon: Clock,
    color: "text-orange-600"
  }, {
    label: "Concluídas",
    value: audits.filter(a => a.status === 'completed').length,
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
              {scheduledAudits.map(audit => <div key={audit.id} className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-zinc-950">
                  <div>
                    <p className="font-medium">{audit.company_name}</p>
                    <p className="text-sm text-muted-foreground">{audit.location_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-700">
                      {format(new Date(audit.next_audit_date!), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR
                })}
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

            {/* Lista de Auditorias */}
            <div className="space-y-3">
              {isLoading ? <p className="text-center text-muted-foreground py-8">Carregando auditorias...</p> : filteredAudits.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhuma auditoria encontrada</p> : filteredAudits.map(audit => <div key={audit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}>
                    <div className="space-y-1 mb-3 sm:mb-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{audit.company_name}</p>
                        {getStatusBadge(audit.status)}
                        {audit.score_level && getScoreLevelBadge(audit.score_level)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {audit.location_name} • Auditor: {audit.auditor_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Iniciada em {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR
                  })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {audit.score !== null && <div className="text-right">
                          <p className="text-2xl font-bold">{audit.score.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Score 5S</p>
                        </div>}
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>)}
            </div>
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