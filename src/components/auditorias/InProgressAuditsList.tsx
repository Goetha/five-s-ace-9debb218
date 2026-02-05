import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  MapPin, 
  Clock, 
  Building2, 
  Trash2,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deleteAuditFromCache, isOfflineId } from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";

export interface InProgressAudit {
  id: string;
  company_id: string;
  company_name: string;
  area_name: string;
  environment_name: string;
  local_name: string;
  started_at: string;
  answered_count: number;
  total_count: number;
  partial_score: number | null;
}

interface InProgressAuditsListProps {
  audits: InProgressAudit[];
  isLoading: boolean;
  onAuditDeleted: () => void;
}

export function InProgressAuditsList({ audits, isLoading, onAuditDeleted }: InProgressAuditsListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteAuditId, setDeleteAuditId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleContinue = (auditId: string) => {
    navigate(`/auditor/auditoria/${auditId}`);
  };

  const handleDelete = async () => {
    if (!deleteAuditId) return;
    
    setIsDeleting(true);
    try {
      const isOffline = isOfflineId(deleteAuditId);
      const isOnline = navigator.onLine;
      
      if (isOffline || !isOnline) {
        // Offline mode or offline audit: delete from cache
        // If it's a real audit being deleted while offline, queue for sync
        await deleteAuditFromCache(deleteAuditId, !isOffline && !isOnline);
        
        toast({
          title: isOffline ? "Auditoria excluída" : "Auditoria removida localmente",
          description: isOffline 
            ? "A auditoria offline foi excluída." 
            : "A exclusão será sincronizada quando você voltar online.",
        });
      } else {
        // Online mode with online audit: delete from Supabase
        // Delete audit items first (cascade)
        const { error: itemsError } = await supabase
          .from('audit_items')
          .delete()
          .eq('audit_id', deleteAuditId);
        
        if (itemsError) throw itemsError;
        
        // Then delete the audit
        const { error: auditError } = await supabase
          .from('audits')
          .delete()
          .eq('id', deleteAuditId);
        
        if (auditError) throw auditError;
        
        // Also remove from cache to keep in sync
        await deleteAuditFromCache(deleteAuditId, false);
        
        toast({
          title: "Auditoria excluída",
          description: "A auditoria foi excluída com sucesso.",
        });
      }
      
      onAuditDeleted();
    } catch (error) {
      console.error('Error deleting audit:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a auditoria. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteAuditId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 border-2 border-primary/20 bg-primary/5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Continuar Auditorias
        </h2>
        <p className="text-muted-foreground text-center py-4">Carregando...</p>
      </Card>
    );
  }

  if (audits.length === 0) {
    return (
      <Card className="p-6 border-2 border-dashed border-muted-foreground/30">
        <div className="text-center py-4">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma auditoria em andamento</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Inicie uma nova auditoria abaixo
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 sm:p-6 border-2 border-primary/20 bg-primary/5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Continuar Auditorias
          <Badge variant="secondary" className="ml-2">{audits.length}</Badge>
        </h2>
        
        <div className="space-y-3">
          {audits.map((audit) => {
            const progress = audit.total_count > 0 
              ? Math.round((audit.answered_count / audit.total_count) * 100) 
              : 0;
            
            return (
              <div 
                key={audit.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-background rounded-lg border shadow-sm"
              >
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold truncate">{audit.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {audit.area_name} › {audit.environment_name} › {audit.local_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(audit.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    <span className="font-medium text-foreground">
                      {audit.answered_count}/{audit.total_count} perguntas
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="pt-1">
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteAuditId(audit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => handleContinue(audit.id)}
                    className="gap-2 flex-1 sm:flex-initial"
                  >
                    <Play className="h-4 w-4" />
                    Continuar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAuditId} onOpenChange={(open) => !open && setDeleteAuditId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir auditoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A auditoria e todas as respostas serão permanentemente excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
