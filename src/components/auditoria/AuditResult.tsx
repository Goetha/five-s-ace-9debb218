import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import { ExportAuditButton } from "@/components/reports/ExportButtons";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, Eye, Loader2, X, WifiOff } from "lucide-react";
import type { Audit } from "@/types/audit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getFromStore,
  addToStore,
  isOfflineId,
  completeOfflineAudit,
  getCachedEnvironments,
} from "@/lib/offlineStorage";

interface AuditResultProps {
  auditId: string;
  onNewAudit: () => void;
  onViewDetails: () => void;
  isOfflineAudit?: boolean;
}

export function AuditResult({ auditId, onNewAudit, onViewDetails, isOfflineAudit: propIsOffline }: AuditResultProps) {
  const { toast } = useToast();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [locationName, setLocationName] = useState("");
  const [nextAuditDate, setNextAuditDate] = useState("");
  const [observations, setObservations] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Determine if this is an offline audit
  const isOfflineAuditId = isOfflineId(auditId);
  const effectiveIsOffline = propIsOffline || isOfflineAuditId || !navigator.onLine;

  useEffect(() => {
    fetchAuditResult();
  }, [auditId]);

  const fetchAuditResult = async () => {
    try {
      // If offline or offline audit ID, fetch from cache
      if (!navigator.onLine || isOfflineAuditId) {
        console.log('📴 Fetching audit result from cache...');
        setIsOffline(true);
        
        const cachedAudit = await getFromStore<any>('audits', auditId);
        if (cachedAudit) {
          setAudit({
            ...cachedAudit,
            status: cachedAudit.status as 'in_progress' | 'completed',
            score_level: cachedAudit.score_level as 'low' | 'medium' | 'high' | null
          });
          
          // Get location name from cache or use stored name
          if (cachedAudit._locationName) {
            setLocationName(cachedAudit._locationName);
          } else {
            const cachedEnvs = await getCachedEnvironments();
            const location = cachedEnvs.find(e => e.id === cachedAudit.location_id);
            setLocationName(location?.name || 'Local');
          }
          
          setObservations(cachedAudit.observations || "");
          setNextAuditDate(cachedAudit.next_audit_date || "");
        } else {
          throw new Error('Auditoria não encontrada no cache');
        }
      } else {
        // Online mode: fetch from Supabase
        const { data, error } = await supabase
          .from('audits')
          .select(`
            *,
            environments!audits_location_id_fkey(name)
          `)
          .eq('id', auditId)
          .single();

        if (error) throw error;
        
        const auditData = data as any;
        setAudit({
          ...auditData,
          status: auditData.status as 'in_progress' | 'completed',
          score_level: auditData.score_level as 'low' | 'medium' | 'high' | null
        });
        setLocationName(data.environments.name);
        setObservations(data.observations || "");
        setNextAuditDate(data.next_audit_date || "");
      }
    } catch (error) {
      console.error('Error fetching audit result:', error);
      toast({
        title: "Erro ao carregar resultado",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If offline or offline audit, save to cache
      if (!navigator.onLine || isOfflineAuditId) {
        console.log('📴 Saving audit result offline...');
        
        // Update the cached audit with observations
        const cachedAudit = await getFromStore<any>('audits', auditId);
        if (cachedAudit) {
          const updatedAudit = {
            ...cachedAudit,
            observations: observations || null,
            next_audit_date: nextAuditDate || null,
          };
          await addToStore('audits', updatedAudit);
          
          // If this is an offline audit that needs completion data saved
          if (isOfflineAuditId) {
            await completeOfflineAudit(auditId, {
              observations: observations || undefined,
              next_audit_date: nextAuditDate || undefined,
            });
          }
        }

        toast({
          title: "Dados salvos (Offline)",
          description: "As informações serão sincronizadas quando você voltar online."
        });

        onViewDetails();
      } else {
        // Online mode: save to Supabase
        const { error } = await supabase
          .from('audits')
          .update({
            next_audit_date: nextAuditDate || null,
            observations: observations || null
          })
          .eq('id', auditId);

        if (error) throw error;

        toast({
          title: "Dados salvos",
          description: "As informações foram atualizadas."
        });

        onViewDetails();
      }
    } catch (error) {
      console.error('Error saving audit data:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !audit) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const scoreLevel = audit.score ? getScoreLevel(audit.score) : 'low';

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Offline indicator */}
        {effectiveIsOffline && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <WifiOff className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Modo Offline - Os dados serão sincronizados quando você voltar online
            </span>
          </div>
        )}

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-2">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">🎉 Auditoria Concluída</h2>
        </div>

        <div className="space-y-4 py-4 border-y">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Local</p>
              <p className="font-medium">{locationName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data</p>
              <p className="font-medium">
                {audit.completed_at 
                  ? format(new Date(audit.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                }
              </p>
            </div>
          </div>

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
              <p className="text-sm text-muted-foreground mb-1">Pontuação</p>
              <p className="text-5xl font-bold">{audit.score?.toFixed(1)}</p>
              <p className="text-muted-foreground">/10</p>
            </div>
            <div className="flex justify-center">
              <ScoreLevelIndicator level={scoreLevel} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="next-audit" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agendar Próxima Auditoria
            </Label>
            <Input
              id="next-audit"
              type="date"
              value={nextAuditDate}
              onChange={(e) => setNextAuditDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações Gerais (opcional)</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Adicione observações sobre a auditoria..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Only show export button when online */}
          {!effectiveIsOffline && (
            <ExportAuditButton auditId={auditId} variant="outline" />
          )}
          <Button
            variant="outline"
            onClick={onNewAudit}
            disabled={isSaving}
            className="flex-1"
          >
            Nova Auditoria
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Salvar e Ver Detalhes
          </Button>
        </div>
      </div>
    </Card>
  );
}