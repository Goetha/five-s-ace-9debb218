import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Criterion } from "@/types/criterion";

interface BulkActionsBarProps {
  selectedIds: string[];
  criteria: Criterion[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, criteria, onSuccess, onClearSelection }: BulkActionsBarProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  const selected = criteria.filter(c => selectedIds.includes(c.id));
  const allInherited = selected.every(c => c.origin === 'ifa');
  const allCustom = selected.every(c => c.origin === 'custom');

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_criteria')
        .update({ status: 'active' })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "✓ Critérios ativados",
        description: `${selectedIds.length} critério(s) ativado(s) com sucesso`
      });

      onSuccess();
      onClearSelection();
    } catch (error: any) {
      toast({
        title: "Erro ao ativar critérios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_criteria')
        .update({ status: 'inactive' })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "✓ Critérios desativados",
        description: `${selectedIds.length} critério(s) desativado(s) com sucesso`
      });

      onSuccess();
      onClearSelection();
    } catch (error: any) {
      toast({
        title: "Erro ao desativar critérios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_criteria')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "✓ Critérios excluídos",
        description: `${selectedIds.length} critério(s) excluído(s) com sucesso`
      });

      onSuccess();
      onClearSelection();
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir critérios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-lg p-4 min-w-[320px] md:min-w-[500px]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {selectedIds.length}
            </Badge>
            <span className="text-sm">
              critério{selectedIds.length > 1 ? 's' : ''} selecionado{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleActivate}
              disabled={loading}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Ativar</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDeactivate}
              disabled={loading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Desativar</span>
            </Button>


            {allCustom && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Excluir Critérios Personalizados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir {selectedIds.length} critério(s) personalizado(s) permanentemente.
              <br /><br />
              ⚠️ Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Critérios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
