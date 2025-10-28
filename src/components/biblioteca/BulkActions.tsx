import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag, FileText, ToggleLeft, Trash2 } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
}

const BulkActions = ({ selectedCount, onClearSelection }: BulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 mb-4 border-2 border-primary/50 bg-primary/5 animate-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {selectedCount} {selectedCount === 1 ? "item selecionado" : "itens selecionados"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar seleção
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Adicionar Tags
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Adicionar a Modelo
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4" />
            Desativar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-error hover:bg-error/10"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default BulkActions;
