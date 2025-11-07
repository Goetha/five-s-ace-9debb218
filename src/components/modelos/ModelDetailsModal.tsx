import { useState, useEffect } from "react";
import { MasterModel } from "@/types/model";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw, Building, Tags } from "lucide-react";
import { formatDate, getTimeAgo, normalizeSenso } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: MasterModel | null;
}

interface Criterion {
  id: string;
  name: string;
  scoring_type: string;
  senso: string[];
}

interface Company {
  id: string;
  name: string;
}

const sensoColors: Record<string, string> = {
  "1S": "bg-red-100 text-red-700 border-red-300",
  "2S": "bg-orange-100 text-orange-700 border-orange-300",
  "3S": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "4S": "bg-green-100 text-green-700 border-green-300",
  "5S": "bg-blue-100 text-blue-700 border-blue-300",
};

export default function ModelDetailsModal({ open, onOpenChange, model }: ModelDetailsModalProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  useEffect(() => {
    if (open && model) {
      loadCriteria();
      loadCompanies();
    }
  }, [open, model]);

  const loadCriteria = async () => {
    if (!model) return;
    
    try {
      setIsLoadingCriteria(true);
      
      const { data, error } = await supabase
        .from("master_model_criteria")
        .select(`
          criterion_id,
          master_criteria (
            id,
            name,
            scoring_type,
            senso
          )
        `)
        .eq("model_id", model.id);

      if (error) throw error;

      const criteriaList = data
        .map((item: any) => item.master_criteria)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          scoring_type: c.scoring_type,
          senso: normalizeSenso(c.senso),
        }));

      setCriteria(criteriaList);
    } catch (error) {
      console.error("Erro ao carregar critérios:", error);
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  const loadCompanies = async () => {
    if (!model) return;
    
    try {
      setIsLoadingCompanies(true);
      
      const { data, error } = await supabase
        .from("company_models")
        .select(`
          company_id,
          companies (
            id,
            name
          )
        `)
        .eq("model_id", model.id)
        .eq("status", "active");

      if (error) throw error;

      const companiesList = data
        .map((item: any) => item.companies)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
        }));

      setCompanies(companiesList);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Detalhes do Modelo</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Informações completas do modelo mestre selecionado</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground break-words">{model.name}</h3>
              <Badge variant={model.status === "active" ? "default" : "secondary"} className="w-fit">
                {model.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{model.description}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" /> 
              <span className="break-words">Criado em {formatDate(model.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 flex-shrink-0" /> 
              <span className="break-words">Atualizado {getTimeAgo(model.updated_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 flex-shrink-0" /> 
              <span className="break-words">{model.companies_using} empresas usando</span>
            </div>
          </div>

          {/* Distribuição por senso */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Distribuição por Senso</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Object.entries(model.criteria_by_senso).map(([senso, count]) => (
                <Badge key={senso} variant="outline" className={`${sensoColors[senso]} text-xs`}>
                  {senso}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Empresas vinculadas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Empresas vinculadas ({companies.length})
              </p>
            </div>
            <div className="border rounded-lg divide-y max-h-40 sm:max-h-48 overflow-y-auto">
              {isLoadingCompanies ? (
                <div className="p-2 sm:p-3 space-y-2">
                  <Skeleton className="h-4 sm:h-5 w-full" />
                  <Skeleton className="h-4 sm:h-5 w-3/4" />
                </div>
              ) : companies.length > 0 ? (
                companies.map((company) => (
                  <div key={company.id} className="p-2 sm:p-3">
                    <p className="text-xs sm:text-sm font-medium break-words">{company.name}</p>
                  </div>
                ))
              ) : (
                <div className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Nenhuma empresa vinculada.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de critérios */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Critérios deste modelo ({model.total_criteria})
              </p>
            </div>
            <div className="border rounded-lg divide-y max-h-48 sm:max-h-64 overflow-y-auto">
              {isLoadingCriteria ? (
                <div className="p-2 sm:p-3 space-y-2">
                  <Skeleton className="h-4 sm:h-5 w-full" />
                  <Skeleton className="h-4 sm:h-5 w-full" />
                  <Skeleton className="h-4 sm:h-5 w-3/4" />
                </div>
              ) : criteria.length > 0 ? (
                criteria.map((c) => (
                  <div key={c.id} className="p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium break-words">{c.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{c.scoring_type}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.senso.map((s) => (
                        <Badge key={s} variant="outline" className={`${sensoColors[s]} text-[10px] sm:text-xs`}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Nenhum critério vinculado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
