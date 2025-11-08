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
      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">
            {selectedCount} {selectedCount === 1 ? "empresa selecionada" : "empresas selecionadas"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Limpar seleção</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            onClick={onAssignModels}
            className="h-8 flex-shrink-0"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Atribuir Modelos</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            className="h-8 flex-shrink-0"
          >
            <UserX className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Desativar</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Excluir</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
