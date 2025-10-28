import { X, Link2, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CompanyBulkActionsProps {
  selectedCount: number;
  onClearSelection?: () => void;
  onAssignModels?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
}

export function CompanyBulkActions({
  selectedCount,
  onClearSelection,
  onAssignModels,
  onDeactivate,
  onDelete,
}: CompanyBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? "empresa selecionada" : "empresas selecionadas"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar seleção
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAssignModels}
            className="h-8"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Atribuir Modelos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            className="h-8"
          >
            <UserX className="h-4 w-4 mr-2" />
            Desativar
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
