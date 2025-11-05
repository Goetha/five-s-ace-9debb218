import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterModel } from "@/types/model";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  status: string;
}

interface LinkCompaniesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: MasterModel | null;
  onSave: (modelId: string, companyIds: string[]) => void;
}

export default function LinkCompaniesModal({ open, onOpenChange, model, onSave }: LinkCompaniesModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && model) {
      loadCompaniesAndLinks();
    }
  }, [open, model]);

  const loadCompaniesAndLinks = async () => {
    if (!model) return;
    
    try {
      setIsLoading(true);

      // Load all active companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, cnpj, city, state, status")
        .eq("status", "active")
        .order("name");

      if (companiesError) throw companiesError;

      setCompanies(companiesData || []);

      // Load companies already linked to this model
      const { data: linksData, error: linksError } = await supabase
        .from("company_models")
        .select("company_id")
        .eq("model_id", model.id)
        .eq("status", "active");

      if (linksError) throw linksError;

      const linkedCompanyIds = linksData?.map((link) => link.company_id) || [];
      setSelectedCompanies(linkedCompanyIds);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
      setSelectedCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  const handleToggleCompany = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (model && selectedCompanies.length > 0) {
      onSave(model.id, selectedCompanies);
      onOpenChange(false);
    }
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Vincular Empresas ao Modelo</DialogTitle>
          <DialogDescription>
            Selecione as empresas que poderão usar o modelo "{model.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresas por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedCompanies.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">
                {selectedCompanies.length} empresa(s) selecionada(s)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCompanies([])}
              >
                Limpar Seleção
              </Button>
            </div>
          )}

          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleToggleCompany(company.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() => handleToggleCompany(company.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="font-medium truncate">{company.name}</p>
                        <Badge variant="outline" className="flex-shrink-0">
                          {company.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CNPJ: {company.cnpj}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {company.city} - {company.state}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : companies.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Building className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma empresa cadastrada
                </p>
                <p className="text-xs text-muted-foreground">
                  Cadastre empresas para poder vincular modelos
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma empresa encontrada
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedCompanies.length === 0}
          >
            Vincular {selectedCompanies.length > 0 && `(${selectedCompanies.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
