import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Criteria, SensoType } from "@/types/criteria";
import { Edit } from "lucide-react";

interface ViewCriterionModalProps {
  open: boolean;
  onClose: () => void;
  criterion: Criteria | null;
  onEdit: () => void;
}

const ViewCriterionModal = ({
  open,
  onClose,
  criterion,
  onEdit,
}: ViewCriterionModalProps) => {
  if (!criterion) return null;

  const getSensoColor = (senso: SensoType) => {
    const colors = {
      "1S": "bg-senso-1s text-white",
      "2S": "bg-senso-2s text-white",
      "3S": "bg-senso-3s text-white",
      "4S": "bg-senso-4s text-white",
      "5S": "bg-senso-5s text-white",
    };
    return colors[senso];
  };

  const getSensoName = (senso: SensoType) => {
    const names = {
      "1S": "Seiri (Utilização)",
      "2S": "Seiton (Organização)",
      "3S": "Seiso (Limpeza)",
      "4S": "Seiketsu (Padronização)",
      "5S": "Shitsuke (Disciplina)",
    };
    return names[senso];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-1">
                {criterion.name}
              </DialogTitle>
              <DialogDescription className="mb-2">
                Detalhes do critério mestre 5S
              </DialogDescription>
              <div className="flex items-center gap-2">
                <Badge className={getSensoColor(criterion.senso)}>
                  {criterion.senso}
                </Badge>
                <Badge
                  variant={criterion.status === "Ativo" ? "default" : "secondary"}
                  className={
                    criterion.status === "Ativo"
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {criterion.status}
                </Badge>
              </div>
            </div>
            <Button onClick={onEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Informações Básicas */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  ID do Critério
                </label>
                <p className="text-base mt-1">{criterion.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Senso 5S
                </label>
                <p className="text-base mt-1">{getSensoName(criterion.senso)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tipo de Pontuação
                </label>
                <p className="text-base mt-1">{criterion.scoreType}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Tags e Contextos</h3>
            <div className="flex flex-wrap gap-2">
              {criterion.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Uso do Critério */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Uso do Critério</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">
                  Empresas usando
                </p>
                <p className="text-3xl font-bold text-primary">
                  {criterion.companiesUsing}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">
                  Modelos usando
                </p>
                <p className="text-3xl font-bold text-primary">
                  {criterion.modelsUsing}
                </p>
              </div>
            </div>
            {criterion.companiesUsing === 0 && criterion.modelsUsing === 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Este critério ainda não está sendo utilizado por nenhuma empresa ou modelo.
              </p>
            )}
          </div>

          <Separator />

          {/* Detalhes Técnicos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Detalhes Técnicos</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{criterion.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pode ser customizado por empresas:</span>
                <span className="font-medium">Sim</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de critério:</span>
                <span className="font-medium">Mestre (IFA Admin)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewCriterionModal;
