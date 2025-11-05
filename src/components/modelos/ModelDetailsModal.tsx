import { MasterModel } from "@/types/model";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw, Building, Tags } from "lucide-react";
import { formatDate, getTimeAgo } from "@/lib/formatters";
import { mockCriteria } from "@/data/mockCriteria";

interface ModelDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: MasterModel | null;
}

const sensoColors: Record<string, string> = {
  "1S": "bg-red-100 text-red-700 border-red-300",
  "2S": "bg-orange-100 text-orange-700 border-orange-300",
  "3S": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "4S": "bg-green-100 text-green-700 border-green-300",
  "5S": "bg-blue-100 text-blue-700 border-blue-300",
};

export default function ModelDetailsModal({ open, onOpenChange, model }: ModelDetailsModalProps) {
  if (!model) return null;

  const criteriaList = model.criteria_ids
    .map((id) => mockCriteria.find((c) => c.id === id))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Modelo</DialogTitle>
          <DialogDescription>Informações completas do modelo mestre selecionado</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold text-foreground">{model.name}</h3>
              <Badge variant={model.status === "active" ? "default" : "secondary"}>
                {model.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" /> Criado em {formatDate(model.created_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4" /> Atualizado {getTimeAgo(model.updated_at)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" /> {model.companies_using} empresas usando
            </div>
          </div>

          {/* Distribuição por senso */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Distribuição por Senso</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(model.criteria_by_senso).map(([senso, count]) => (
                <Badge key={senso} variant="outline" className={sensoColors[senso]}>
                  {senso}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lista de critérios */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Critérios deste modelo ({model.total_criteria})
              </p>
            </div>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {criteriaList.length > 0 ? (
                criteriaList.map((c) => (
                  <div key={c!.id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c!.id} - {c!.name}</p>
                      <p className="text-xs text-muted-foreground">{c!.scoreType}</p>
                    </div>
                    <Badge variant="outline" className={sensoColors[c!.senso]}>{c!.senso}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">Lista de critérios não disponível.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
