import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Criterion } from "@/types/criterion";

interface ViewCriterionModalProps {
  criterion: Criterion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sensoColors = {
  '1S': 'bg-red-500',
  '2S': 'bg-orange-500',
  '3S': 'bg-yellow-500',
  '4S': 'bg-green-500',
  '5S': 'bg-blue-500',
};

export function ViewCriterionModal({ criterion, open, onOpenChange }: ViewCriterionModalProps) {
  if (!criterion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            {criterion.origin === 'ifa' ? (
              <Badge className="bg-blue-100 text-blue-700 border-0">CRITÉRIO HERDADO DO IFA</Badge>
            ) : (
              <Badge className="bg-purple-100 text-purple-700 border-0">CRITÉRIO PERSONALIZADO</Badge>
            )}
            <DialogTitle className="flex items-center gap-2">
              <Badge className={`${sensoColors[criterion.senso]} text-white`}>
                {criterion.senso}
              </Badge>
              {criterion.name}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Descrição:</h4>
            <p className="text-sm text-muted-foreground">
              {criterion.description || 'Sem descrição'}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Tipo de Pontuação:</h4>
            <p className="text-sm">{criterion.scoring_type}</p>
          </div>

          {criterion.tags && criterion.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {criterion.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {criterion.origin === 'ifa' && criterion.origin_model_name && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Origem:</h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                  <p className="text-sm">Modelo IFA: <strong>{criterion.origin_model_name}</strong></p>
                  <p className="text-xs text-muted-foreground">
                    Este critério foi criado pelo IFA Admin e herdado através do modelo vinculado.
                  </p>
                </div>
              </div>
            </>
          )}

          {criterion.origin === 'custom' && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Controle Total:</h4>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Este critério foi criado por você. Você tem controle total: pode editar tudo, duplicar ou excluir.
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Status:</h4>
            {criterion.status === 'active' ? (
              <Badge className="bg-emerald-500">Ativo</Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}