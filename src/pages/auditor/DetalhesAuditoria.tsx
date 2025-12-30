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
import { ArrowLeft, Calendar, Check, CloudOff, Loader2, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuditChecklist } from "@/components/auditoria/AuditChecklist";
import { ChecklistItemReadOnly } from "@/components/auditoria/ChecklistItemReadOnly";
import { AuditResult } from "@/components/auditoria/AuditResult";
import { EmptyAuditWarning } from "@/components/auditorias/EmptyAuditWarning";
import { ExportAuditButton } from "@/components/reports/ExportButtons";
import { cn } from "@/lib/utils";
import type { Audit, AuditItem } from "@/types/audit";
import {
  isOfflineId,
  getFromStore,
  getCachedAuditItemsByAuditId,
} from "@/lib/offlineStorage";

interface AuditWithLocation extends Audit {
  location_name: string;
}

export default function DetalhesAuditoria() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isOffline } = useAuth();
  const [audit, setAudit] = useState<AuditWithLocation | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineAudit, setIsOfflineAudit] = useState(false);
  
  const backLink = userRole === 'ifa_admin' ? '/auditorias' : '/auditor/minhas-auditorias';
  const backLabel = userRole === 'ifa_admin' ? 'Auditorias' : 'Minhas Auditorias';

  useEffect(() => {
    if (id) {
      // Check if this is an offline audit
      if (isOfflineId(id)) {
        setIsOfflineAudit(true);
        fetchOfflineAuditDetails();
      } else {
        fetchAuditDetails();
      }
    }
  }, [id]);

  const fetchOfflineAuditDetails = async () => {
    try {
      // Get audit from IndexedDB
      const auditData = await getFromStore<any>('audits', id!);
      
      if (!auditData) {
        toast({
          title: "Auditoria não encontrada",
          description: "Esta auditoria offline não foi encontrada.",
          variant: "destructive"
        });
        navigate(backLink);
        return;
      }

      const auditWithLocation: AuditWithLocation = {
        ...auditData,
        status: auditData.status as 'in_progress' | 'completed',
        score_level: auditData.score_level as 'low' | 'medium' | 'high' | null,
        location_name: auditData._locationName || 'Local offline',
        started_at: auditData.started_at || new Date().toISOString(),
      };

      setAudit(auditWithLocation);

      // Get items from IndexedDB
      const itemsData = await getCachedAuditItemsByAuditId(id!);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching offline audit details:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  // Se a auditoria está em andamento, mostra o checklist ou warning se vazia
  if (audit.status === 'in_progress') {
    const content = (
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-3 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(backLink)} className="mb-2 sm:mb-4 text-xs sm:text-sm">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Voltar
          </Button>
          {isOfflineAudit && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
              <CloudOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyAuditWarning auditId={audit.id} locationName={audit.location_name} />
        ) : (
          <AuditChecklist 
            auditId={audit.id} 
            isOfflineAudit={isOfflineAudit}
            onCompleted={() => {
              toast({
                title: isOfflineAudit ? "Auditoria salva offline" : "Auditoria concluída!",
                description: isOfflineAudit 
                  ? "Será sincronizada quando você voltar online."
                  : "Os dados foram salvos com sucesso."
              });
              navigate(backLink);
            }} 
          />
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
        label: audit.location_name
      }]}>
        {content}
      </CompanyAdminLayout>
    );
  }

  // Se a auditoria está concluída, mostra os detalhes
  const scoreLevel = audit.score ? getScoreLevel(audit.score) : 'low';
  
  // Parse photo_urls for all items
  // Helper to safely parse photo_url (can be JSON array or plain URL)
  const safeParsePhotoUrls = (photoUrl: string | null | undefined): string[] => {
    if (!photoUrl) return [];
    try {
      const parsed = JSON.parse(photoUrl);
      return Array.isArray(parsed) ? parsed : [photoUrl];
    } catch {
      return [photoUrl];
    }
  };

  const parsedItems = items.map(item => ({
    ...item,
    photo_urls: safeParsePhotoUrls(item.photo_url)
  }));
  
  const yesItems = parsedItems.filter(item => item.answer === true);
  const noItems = parsedItems.filter(item => item.answer === false);
  
  const content = (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate(backLink)} className="text-xs sm:text-sm">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {isOfflineAudit && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
              <CloudOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          {audit.status === 'completed' && !isOfflineAudit && (
            <ExportAuditButton auditId={audit.id} size="sm" />
          )}
        </div>
      </div>

      <Card className="p-3 sm:p-6 bg-card">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h1 className="text-base sm:text-2xl font-bold truncate">{audit.location_name}</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge className={cn(
              "flex-shrink-0 text-xs px-2 py-0.5",
              audit.status === 'completed' ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400" : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400"
            )}>
              {audit.status === 'completed' ? 'Concluída' : 'Em Andamento'}
            </Badge>
          </div>

          {audit.status === 'completed' && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm font-medium">Sim</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{audit.total_yes}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-red-600 dark:text-red-400 mb-1">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm font-medium">Não</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{audit.total_no}</p>
                </div>
              </div>

              <div className="text-center space-y-2 sm:space-y-3 p-4 sm:p-6 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pontuação Final</p>
                  <p className="text-4xl sm:text-5xl font-bold">{audit.score?.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">/10</p>
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
        <Card className="p-3 sm:p-6 bg-card">
          <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">Respostas Detalhadas</h2>
          <div className="space-y-4 sm:space-y-6">
            {yesItems.length > 0 && (
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-sm sm:text-lg font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  Conformidades ({yesItems.length})
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                  {yesItems.map((item, index) => (
                    <ChecklistItemReadOnly key={item.id} item={item} index={index} />
                  ))}
                </div>
              </div>
            )}

            {noItems.length > 0 && (
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-sm sm:text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  Não-Conformidades ({noItems.length})
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                  {noItems.map((item, index) => (
                    <ChecklistItemReadOnly key={item.id} item={item} index={index} />
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