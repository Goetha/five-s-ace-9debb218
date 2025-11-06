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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Auditor } from "@/types/auditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
interface EditAuditorCompaniesModalProps {
  auditor: Auditor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Company {
  id: string;
  name: string;
  status: string;
}

export function EditAuditorCompaniesModal({
  auditor,
  open,
  onOpenChange,
  onSuccess,
}: EditAuditorCompaniesModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
      if (auditor) {
        // Prefill with any linked companies returned by the function
        setSelectedCompanyIds(auditor.linked_companies?.map(c => c.id) || []);
        // Then override with DB truth from user_companies
        loadAuditorLinkedCompanies(auditor.id);
      }
    }
  }, [open, auditor]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error loading companies from backend:', error);
        toast({
          title: "Erro ao carregar empresas",
          description: "Não foi possível carregar a lista de empresas do backend.",
          variant: "destructive",
        });
        setCompanies([]);
        return;
      }

      console.log('✅ Empresas carregadas do backend:', data);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar empresas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditorLinkedCompanies = async (auditorId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', auditorId);
      if (error) throw error;
      const ids = (data || []).map((row: { company_id: string }) => row.company_id);
      if (ids.length > 0) {
        console.log('✅ Empresas vinculadas do auditor via DB:', ids);
        setSelectedCompanyIds(ids);
      }
    } catch (err) {
      console.error('Error loading auditor company links:', err);
    }
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSave = async () => {
    if (!auditor) return;

    if (selectedCompanyIds.length === 0) {
      toast({
        title: "Validação",
        description: "Selecione pelo menos uma empresa.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('update-auditor-companies', {
        body: {
          auditor_id: auditor.id,
          company_ids: selectedCompanyIds,
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Empresas vinculadas atualizadas com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating auditor companies:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as empresas vinculadas.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresas Vinculadas</DialogTitle>
          <DialogDescription>
            Selecione as empresas às quais {auditor?.name} terá acesso
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma empresa ativa encontrada
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map(company => (
                  <div
                    key={company.id}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleCompany(company.id)}
                  >
                    <Checkbox
                      id={company.id}
                      checked={selectedCompanyIds.includes(company.id)}
                      onCheckedChange={() => handleToggleCompany(company.id)}
                    />
                    <Label
                      htmlFor={company.id}
                      className="flex-1 cursor-pointer"
                    >
                      {company.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {selectedCompanyIds.length} empresa(s) selecionada(s)
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
