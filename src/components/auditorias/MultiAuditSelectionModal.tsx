import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Eye,
  Calendar,
  User,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditInfo {
  id: string;
  status: string;
  score: number | null;
  score_level: string | null;
  started_at: string;
  auditor_name?: string;
}

interface MultiAuditSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localName: string;
  audits: AuditInfo[];
  onAuditClick: (auditId: string) => void;
  onAuditDeleted?: () => void;
}

export function MultiAuditSelectionModal({
  open,
  onOpenChange,
  localName,
  audits,
  onAuditClick,
  onAuditDeleted
}: MultiAuditSelectionModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge variant="default" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Em Andamento
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-700 bg-emerald-50 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Concluída
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const getScoreLevelConfig = (level: string | null) => {
    if (!level) return null;
    const config = {
      low: { label: 'Crítico', className: 'bg-red-100 text-red-800 border-red-300', emoji: '😢' },
      medium: { label: 'Atenção', className: 'bg-amber-100 text-amber-800 border-amber-300', emoji: '😐' },
      high: { label: 'Excelente', className: 'bg-emerald-100 text-emerald-800 border-emerald-300', emoji: '😃' }
    };
    return config[level as keyof typeof config] || config.medium;
  };

  const handleDelete = async (auditId: string) => {
    if (confirmDeleteId !== auditId) {
      setConfirmDeleteId(auditId);
      return;
    }

    setDeletingId(auditId);
    try {
      // First delete audit items
      const { error: itemsError } = await supabase
        .from('audit_items')
        .delete()
        .eq('audit_id', auditId);
      
      if (itemsError) throw itemsError;

      // Then delete the audit
      const { error: auditError } = await supabase
        .from('audits')
        .delete()
        .eq('id', auditId);
      
      if (auditError) throw auditError;

      toast.success('Auditoria excluída com sucesso');
      onAuditDeleted?.();
      
      // If only one audit left, close modal
      if (audits.length <= 2) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erro ao excluir auditoria:', error);
      toast.error('Erro ao excluir auditoria');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleView = (auditId: string) => {
    onAuditClick(auditId);
    onOpenChange(false);
  };

  // Sort by date, newest first
  const sortedAudits = [...audits].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Auditorias em</span>
            <Badge variant="outline" className="font-normal">
              {localName}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Este local possui {audits.length} auditorias. Selecione qual deseja visualizar ou exclua as que não deseja manter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sortedAudits.map((audit, index) => {
            const scoreLevelConfig = getScoreLevelConfig(audit.score_level);
            const isNewest = index === 0;
            const isConfirmingDelete = confirmDeleteId === audit.id;
            
            return (
              <Card 
                key={audit.id} 
                className={cn(
                  "p-4 transition-all",
                  isNewest && "ring-2 ring-primary/50 bg-primary/5",
                  isConfirmingDelete && "ring-2 ring-destructive/50 bg-destructive/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Status and score badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(audit.status)}
                      {scoreLevelConfig && (
                        <Badge variant="outline" className={cn(scoreLevelConfig.className, "text-xs gap-1")}>
                          <span>{scoreLevelConfig.emoji}</span>
                          {scoreLevelConfig.label}
                        </Badge>
                      )}
                      {isNewest && (
                        <Badge variant="default" className="text-xs bg-primary">
                          Mais recente
                        </Badge>
                      )}
                    </div>

                    {/* Date and auditor */}
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {audit.auditor_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          <span>{audit.auditor_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Score if completed */}
                    {audit.score !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <span className="text-lg font-bold">{audit.score.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleView(audit.id)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant={isConfirmingDelete ? "destructive" : "ghost"}
                      className={cn(
                        "gap-1.5",
                        !isConfirmingDelete && "text-destructive hover:text-destructive hover:bg-destructive/10"
                      )}
                      onClick={() => handleDelete(audit.id)}
                      disabled={deletingId === audit.id}
                    >
                      {deletingId === audit.id ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Excluindo...
                        </>
                      ) : isConfirmingDelete ? (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          Confirmar
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isConfirmingDelete && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Clique novamente para confirmar a exclusão
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
