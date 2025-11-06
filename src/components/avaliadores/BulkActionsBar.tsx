import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 flex items-center justify-between sticky top-4 z-10 border-primary shadow-lg">
      <div className="flex items-center gap-4">
        <p className="font-medium">
          {selectedCount} avaliador{selectedCount > 1 ? "es" : ""} selecionado{selectedCount > 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-2" />
          Limpar seleção
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir Selecionados
        </Button>
      </div>
    </Card>
  );
}
