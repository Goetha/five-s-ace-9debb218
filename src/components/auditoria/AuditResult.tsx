import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScoreLevelIndicator, getScoreLevel } from "@/components/modelos/ScoreLevelIndicator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, Eye, Loader2, X } from "lucide-react";
import type { Audit } from "@/types/audit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditResultProps {
  auditId: string;
  onNewAudit: () => void;
  onViewDetails: () => void;
}

export function AuditResult({ auditId, onNewAudit, onViewDetails }: AuditResultProps) {
  const { toast } = useToast();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [locationName, setLocationName] = useState("");
  const [nextAuditDate, setNextAuditDate] = useState("");
  const [observations, setObservations] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAuditResult();
  }, [auditId]);

  const fetchAuditResult = async () => {
    try {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          environments!audits_location_id_fkey(name)
        `)
        .eq('id', auditId)
        .single();

      if (error) throw error;
      
      setAudit(data);
      setLocationName(data.environments.name);
      setObservations(data.observations || "");
      setNextAuditDate(data.next_audit_date || "");
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
                {format(new Date(audit.completed_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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

        <div className="flex gap-3">
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
