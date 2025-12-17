import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Clock, MapPin, User, Calendar, FileQuestion, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InProgressAudit {
  id: string;
  company_id: string;
  company_name: string;
  location_path: string;
  auditor_name: string;
  started_at: string;
  total_questions: number;
  answered_questions: number;
  partial_score: number | null;
}

interface ManageAuditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuditsDeleted: () => void;
}

export function ManageAuditsModal({ open, onOpenChange, onAuditsDeleted }: ManageAuditsModalProps) {
  const [audits, setAudits] = useState<InProgressAudit[]>([]);
  const [selectedAudits, setSelectedAudits] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterCompany, setFilterCompany] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchInProgressAudits();
    }
  }, [open]);

  const fetchInProgressAudits = async () => {
    setIsLoading(true);
    try {
      // Buscar auditorias em andamento
      const { data: auditsData, error: auditsError } = await supabase
        .from('audits')
        .select('*')
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (auditsError) throw auditsError;

      if (!auditsData || auditsData.length === 0) {
        setAudits([]);
        setIsLoading(false);
        return;
      }

      // Buscar dados relacionados em paralelo
      const [companiesRes, environmentsRes, profilesRes, auditItemsRes] = await Promise.all([
        supabase.from('companies').select('id, name'),
        supabase.from('environments').select('id, name, parent_id, company_id'),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('audit_items')
          .select('audit_id, answer')
          .in('audit_id', auditsData.map(a => a.id))
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (environmentsRes.error) throw environmentsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (auditItemsRes.error) throw auditItemsRes.error;

      // Criar mapas para lookup
      const companiesMap = new Map(companiesRes.data?.map(c => [c.id, c]) || []);
      const envMap = new Map(environmentsRes.data?.map(e => [e.id, e]) || []);
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);

      // Contar respostas por auditoria
      const answeredByAudit = new Map<string, number>();
      for (const item of (auditItemsRes.data || [])) {
        if (item.answer !== null) {
          const count = answeredByAudit.get(item.audit_id) || 0;
          answeredByAudit.set(item.audit_id, count + 1);
        }
      }

      // Função para construir o caminho da localização
      const buildLocationPath = (locationId: string): string => {
        const path: string[] = [];
        let current = envMap.get(locationId);
        
        while (current) {
          path.unshift(current.name);
          current = current.parent_id ? envMap.get(current.parent_id) : null;
        }
        
        // Remover o primeiro (root/empresa) se houver mais de 1 nível
        if (path.length > 1) {
          path.shift();
        }
        
        return path.join(' > ');
      };

      // Mapear auditorias com informações completas
      const mappedAudits: InProgressAudit[] = auditsData.map(audit => {
        const company = companiesMap.get(audit.company_id);
        const auditor = profilesMap.get(audit.auditor_id);
        const answered = answeredByAudit.get(audit.id) || 0;

        return {
          id: audit.id,
          company_id: audit.company_id,
          company_name: company?.name || 'N/A',
          location_path: buildLocationPath(audit.location_id),
          auditor_name: auditor?.full_name || 'N/A',
          started_at: audit.started_at,
          total_questions: audit.total_questions,
          answered_questions: answered,
          partial_score: audit.score
        };
      });

      setAudits(mappedAudits);
    } catch (error) {
      console.error('Error fetching in-progress audits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAudit = (auditId: string) => {
    const newSelected = new Set(selectedAudits);
    if (newSelected.has(auditId)) {
      newSelected.delete(auditId);
    } else {
      newSelected.add(auditId);
    }
    setSelectedAudits(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAudits.size === filteredAudits.length) {
      setSelectedAudits(new Set());
    } else {
      setSelectedAudits(new Set(filteredAudits.map(a => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAudits.size === 0) return;
    
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedAudits);
      
      // Primeiro deletar os audit_items
      const { error: itemsError } = await supabase
        .from('audit_items')
        .delete()
        .in('audit_id', idsToDelete);
      
      if (itemsError) throw itemsError;

      // Depois deletar as auditorias
      const { error: auditsError } = await supabase
        .from('audits')
        .delete()
        .in('id', idsToDelete);
      
      if (auditsError) throw auditsError;

      // Limpar seleção e recarregar
      setSelectedAudits(new Set());
      setShowDeleteConfirm(false);
      await fetchInProgressAudits();
      onAuditsDeleted();
    } catch (error) {
      console.error('Error deleting audits:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrar auditorias por empresa
  const filteredAudits = filterCompany === "all" 
    ? audits 
    : audits.filter(a => a.company_id === filterCompany);

  // Obter lista única de empresas
  const companies = Array.from(new Map(audits.map(a => [a.company_id, { id: a.company_id, name: a.company_name }])).values());

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Gerenciar Auditorias em Andamento
            </DialogTitle>
            <DialogDescription>
              Selecione e exclua auditorias que não serão concluídas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtro e ações */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={filteredAudits.length === 0}
                >
                  {selectedAudits.size === filteredAudits.length && filteredAudits.length > 0
                    ? "Desmarcar Todas"
                    : "Selecionar Todas"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedAudits.size === 0}
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir ({selectedAudits.size})
                </Button>
              </div>
            </div>

            {/* Lista de auditorias */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAudits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma auditoria em andamento
                </div>
              ) : (
                filteredAudits.map(audit => (
                  <div 
                    key={audit.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAudits.has(audit.id) 
                        ? 'border-destructive bg-destructive/5' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => toggleSelectAudit(audit.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedAudits.has(audit.id)}
                        onCheckedChange={() => toggleSelectAudit(audit.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{audit.company_name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {audit.answered_questions}/{audit.total_questions} respostas
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{audit.location_path || 'Localização não definida'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 shrink-0" />
                            <span>{audit.auditor_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>
                              Iniciada em {format(new Date(audit.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>

                        {audit.partial_score !== null && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <FileQuestion className="h-3 w-3 shrink-0 text-blue-600" />
                            <span className="text-blue-600 font-medium">
                              Score parcial: {audit.partial_score.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedAudits.size}</strong> auditoria(s) em andamento.
              Esta ação é <strong>irreversível</strong> e todos os dados relacionados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir {selectedAudits.size} auditoria(s)
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
