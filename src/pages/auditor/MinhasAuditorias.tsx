import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import { Calendar, Eye, Loader2, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Audit } from "@/types/audit";

interface AuditWithLocation extends Audit {
  location_name: string;
}

export default function MinhasAuditorias() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [audits, setAudits] = useState<AuditWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchAudits();
  }, [user]);

  const fetchAudits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          environments!audits_location_id_fkey(name)
        `)
        .eq('auditor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const auditsWithLocation = data.map(audit => ({
        ...audit,
        location_name: audit.environments.name
      }));

      setAudits(auditsWithLocation);
    } catch (error) {
      console.error('Error fetching audits:', error);
      toast({
        title: "Erro ao carregar auditorias",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAudits = audits.filter(audit => {
    if (filter === 'all') return true;
    return audit.status === filter;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-700 border-green-300">Concluída</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Em Andamento</Badge>;
  };

  if (isLoading) {
    return (
      <CompanyAdminLayout breadcrumbs={[{ label: "Minhas Auditorias" }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyAdminLayout>
    );
  }

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Minhas Auditorias" }]}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Minhas Auditorias</h1>
            <p className="text-muted-foreground">Gerencie suas avaliações 5S</p>
          </div>
          <Button onClick={() => navigate('/auditor/nova-auditoria')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Auditoria
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas ({audits.length})
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setFilter('in_progress')}
          >
            Em Andamento ({audits.filter(a => a.status === 'in_progress').length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
          >
            Concluídas ({audits.filter(a => a.status === 'completed').length})
          </Button>
        </div>

        {filteredAudits.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma auditoria encontrada</p>
            <Button onClick={() => navigate('/auditor/nova-auditoria')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Auditoria
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAudits.map((audit) => (
              <Card key={audit.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{audit.location_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {getStatusBadge(audit.status)}
                    </div>

                    {audit.status === 'completed' && audit.score !== null && (
                      <div className="flex items-center gap-4 pl-8">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold">{audit.score.toFixed(1)}</span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                        <ScoreLevelIndicator level={getScoreLevel(audit.score)} showLabel={false} />
                      </div>
                    )}

                    {audit.next_audit_date && (
                      <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Próxima auditoria: {format(new Date(audit.next_audit_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => navigate(`/auditor/auditoria/${audit.id}`)}
                    variant={audit.status === 'in_progress' ? 'default' : 'outline'}
                  >
                    {audit.status === 'in_progress' ? (
                      <>Continuar</>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CompanyAdminLayout>
  );
}
