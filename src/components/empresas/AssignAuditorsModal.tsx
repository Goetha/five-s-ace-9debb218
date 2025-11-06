import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { Company } from "@/types/company";
import { Auditor } from "@/types/auditor";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AssignAuditorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess: () => void;
}

export function AssignAuditorsModal({
  open,
  onOpenChange,
  company,
  onSuccess,
}: AssignAuditorsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAuditors, setExistingAuditors] = useState<Auditor[]>([]);
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [loadingAuditors, setLoadingAuditors] = useState(false);

  useEffect(() => {
    if (open && company) {
      loadExistingAuditors();
    }
  }, [open, company]);

  const loadExistingAuditors = async () => {
    setLoadingAuditors(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-all-auditors');
      if (error) throw error;
      
      const auditors = data.auditors || [];
      setExistingAuditors(auditors);
      
      // Pre-select auditors already linked to this company
      if (company) {
        const linkedIds = auditors
          .filter((a: Auditor) => 
            a.linked_companies.some(c => c.id === company.id)
          )
          .map((a: Auditor) => a.id);
        setSelectedAuditorIds(linkedIds);
      }
    } catch (error) {
      console.error('Error loading auditors:', error);
      toast({
        title: "Erro ao carregar avaliadores",
        description: "Não foi possível carregar a lista de avaliadores.",
        variant: "destructive",
      });
    } finally {
      setLoadingAuditors(false);
    }
  };

  const handleToggleAuditor = (auditorId: string) => {
    setSelectedAuditorIds(prev => 
      prev.includes(auditorId) 
        ? prev.filter(id => id !== auditorId)
        : [...prev, auditorId]
    );
  };

  const handleSubmit = async () => {
    if (!company) return;
    
    setIsSubmitting(true);
    try {
      // For each auditor, update their company links
      for (const auditorId of selectedAuditorIds) {
        const auditor = existingAuditors.find(a => a.id === auditorId);
        if (!auditor) continue;
        
        // Check if already linked
        const isAlreadyLinked = auditor.linked_companies.some(c => c.id === company.id);
        if (isAlreadyLinked) continue;
        
        // Add company to auditor's links
        await supabase.functions.invoke('update-auditor-companies', {
          body: {
            userId: auditorId,
            companyIds: [company.id],
            addCompanies: true,
          },
        });
      }

      // Remove unselected auditors
      const previouslyLinkedIds = existingAuditors
        .filter(a => a.linked_companies.some(c => c.id === company.id))
        .map(a => a.id);
      
      const toRemove = previouslyLinkedIds.filter(id => !selectedAuditorIds.includes(id));
      
      for (const auditorId of toRemove) {
        await supabase.functions.invoke('update-auditor-companies', {
          body: {
            userId: auditorId,
            companyIds: [company.id],
            addCompanies: false,
          },
        });
      }

      toast({
        title: "Avaliadores atualizados",
        description: `${selectedAuditorIds.length} avaliador(es) vinculado(s) à empresa.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning auditors:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir os avaliadores.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Atribuir Avaliadores</DialogTitle>
          <DialogDescription>
            Selecione os avaliadores que terão acesso à empresa {company?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loadingAuditors ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : existingAuditors.length > 0 ? (
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Avaliadores Disponíveis
              </Label>
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-3">
                  {existingAuditors.map((auditor) => (
                    <div
                      key={auditor.id}
                      className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <Checkbox
                        id={`auditor-${auditor.id}`}
                        checked={selectedAuditorIds.includes(auditor.id)}
                        onCheckedChange={() => handleToggleAuditor(auditor.id)}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1 space-y-1">
                        <label
                          htmlFor={`auditor-${auditor.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                        >
                          <UserPlus className="h-4 w-4 text-primary" />
                          {auditor.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {auditor.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {auditor.linked_companies.length} empresa(s) vinculada(s)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedAuditorIds.length > 0 && (
                <p className="text-sm text-primary mt-3">
                  {selectedAuditorIds.length} avaliador(es) selecionado(s)
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum avaliador cadastrado no sistema.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || existingAuditors.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
