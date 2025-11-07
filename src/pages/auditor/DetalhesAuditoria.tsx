import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import { ArrowLeft, Calendar, Check, Loader2, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuditChecklist } from "@/components/auditoria/AuditChecklist";
import { AuditResult } from "@/components/auditoria/AuditResult";
import { cn } from "@/lib/utils";
import type { Audit, AuditItem } from "@/types/audit";

interface AuditWithLocation extends Audit {
  location_name: string;
}

export default function DetalhesAuditoria() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [audit, setAudit] = useState<AuditWithLocation | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const backLink = userRole === 'ifa_admin' ? '/auditorias' : '/auditor/minhas-auditorias';
  const backLabel = userRole === 'ifa_admin' ? 'Auditorias' : 'Minhas Auditorias';

  useEffect(() => {
    if (id) {
      fetchAuditDetails();
    }
  }, [id]);

  const fetchAuditDetails = async () => {
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('audits')
        .select(`
          *,
          environments!audits_location_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (auditError) throw auditError;

      // Type cast to ensure TypeScript compatibility
      const typedAudit = auditData as any;
      const auditWithLocation = {
        ...typedAudit,
        status: typedAudit.status as 'in_progress' | 'completed',
        score_level: typedAudit.score_level as 'low' | 'medium' | 'high' | null,
        location_name: auditData.environments.name
      };

      setAudit(auditWithLocation);

      const { data: itemsData, error: itemsError } = await supabase
        .from('audit_items')
        .select('*')
        .eq('audit_id', id)
        .order('created_at');

      if (itemsError) throw itemsError;

      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching audit details:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !audit) {
    const content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
    
    if (userRole === 'ifa_admin') {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto p-6">
            {content}
          </div>
        </div>
      );
    }
    
    return (
      <CompanyAdminLayout breadcrumbs={[{
        label: backLabel,
        href: backLink
      }, {
        label: "Detalhes"
      }]}>
        {content}
      </CompanyAdminLayout>
    );
  }

  // Se a auditoria está em andamento, mostra o checklist
  if (audit.status === 'in_progress') {
    const content = (
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-3 sm:space-y-6">
        <Button variant="ghost" onClick={() => navigate(backLink)} className="mb-2 sm:mb-4 text-xs sm:text-sm">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
          Voltar
        </Button>

        <AuditChecklist auditId={audit.id} onCompleted={() => {
          toast({
            title: "Auditoria concluída!",
            description: "Os dados foram salvos com sucesso."
          });
          navigate(backLink);
        }} />
      </div>
    );
    
    if (userRole === 'ifa_admin') {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          {content}
        </div>
      );
    }
    
    return (
      <CompanyAdminLayout breadcrumbs={[{
        label: backLabel,
        href: backLink
      }, {
        label: audit.location_name
      }]}>
        {content}
      </CompanyAdminLayout>
    );
  }

  // Se a auditoria está concluída, mostra os detalhes
  const scoreLevel = audit.score ? getScoreLevel(audit.score) : 'low';
  const yesItems = items.filter(item => item.answer === true);
  const noItems = items.filter(item => item.answer === false);
  
  const content = (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-3 sm:space-y-6">
      <Button variant="ghost" onClick={() => navigate(backLink)} className="mb-2 sm:mb-4 text-xs sm:text-sm">
        <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
        Voltar
      </Button>

      <Card className="p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h1 className="text-lg sm:text-2xl font-bold truncate">{audit.location_name}</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge className={cn(
              "flex-shrink-0 text-xs",
              audit.status === 'completed' ? "bg-green-100 text-green-700 border-green-300" : "bg-blue-100 text-blue-700 border-blue-300"
            )}>
              {audit.status === 'completed' ? 'Concluída' : 'Em Andamento'}
            </Badge>
          </div>

          {audit.status === 'completed' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-medium">Sim</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{audit.total_yes}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                    <X className="h-5 w-5" />
                    <span className="text-sm font-medium">Não</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{audit.total_no}</p>
                </div>
              </div>

              <div className="text-center space-y-3 p-6 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pontuação Final</p>
                  <p className="text-5xl font-bold">{audit.score?.toFixed(1)}</p>
                  <p className="text-muted-foreground">/10</p>
                </div>
                <div className="flex justify-center">
                  <ScoreLevelIndicator level={scoreLevel} />
                </div>
              </div>
            </>
          )}

          {audit.next_audit_date && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg text-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-blue-900">
                Próxima auditoria agendada para: {format(new Date(audit.next_audit_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          {audit.observations && (
            <div className="space-y-2">
              <h3 className="font-semibold">Observações Gerais</h3>
              <p className="text-muted-foreground">{audit.observations}</p>
            </div>
          )}
        </div>
      </Card>

      {audit.status === 'completed' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Respostas Detalhadas</h2>
          <div className="space-y-4">
            {yesItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Conformidades ({yesItems.length})
                </h3>
                <div className="space-y-2">
                  {yesItems.map((item, index) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted">
                      <p className="text-sm">
                        <span className="font-medium">Pergunta {index + 1}:</span> {item.question}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {noItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600 flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Não-Conformidades ({noItems.length})
                </h3>
                <div className="space-y-3">
                  {noItems.map((item, index) => (
                    <div key={item.id} className="p-4 bg-red-50 rounded-lg space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Pergunta {index + 1}:</span> {item.question}
                      </p>
                      {item.comment && (
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-red-300">
                          {item.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
  
  if (userRole === 'ifa_admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        {content}
      </div>
    );
  }
  
  return (
    <CompanyAdminLayout breadcrumbs={[{
      label: backLabel,
      href: backLink
    }, {
      label: "Detalhes"
    }]}>
      {content}
    </CompanyAdminLayout>
  );
}
