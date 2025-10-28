import { Edit, Copy, Eye, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Criteria } from "@/types/criteria";

interface CriteriaCardsProps {
  criteria: Criteria[];
  selectedIds: string[];
  onSelectOne: (id: string, checked: boolean) => void;
  onView: (criterion: Criteria) => void;
  onEdit: (criterion: Criteria) => void;
  onDuplicate: (criterion: Criteria) => void;
}

const CriteriaCards = ({
  criteria,
  selectedIds,
  onSelectOne,
  onView,
  onEdit,
  onDuplicate,
}: CriteriaCardsProps) => {
  const getSensoBackgroundColor = (senso: string) => {
    const colors = {
      "1S": "bg-red-500/10 border-red-500/20",
      "2S": "bg-orange-500/10 border-orange-500/20",
      "3S": "bg-yellow-500/10 border-yellow-500/20",
      "4S": "bg-green-500/10 border-green-500/20",
      "5S": "bg-blue-500/10 border-blue-500/20",
    };
    return colors[senso as keyof typeof colors] || "bg-gray-500/10 border-gray-500/20";
  };

  const getWeightColor = (weight: number) => {
    if (weight >= 8) return "bg-red-500";
    if (weight >= 4) return "bg-orange-500";
    return "bg-yellow-500";
  };

  if (criteria.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhum critério encontrado</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {criteria.map((criterion) => (
        <Card key={criterion.id} className={`hover:shadow-lg transition-all relative overflow-hidden ${getSensoBackgroundColor(criterion.senso)}`}>
          <CardContent className="p-6 space-y-4 relative">
            {/* Header com checkbox e título */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedIds.includes(criterion.id)}
                onCheckedChange={(checked) =>
                  onSelectOne(criterion.id, checked === true)
                }
                className="mt-1"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {criterion.id}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {criterion.senso}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base leading-tight">
                  {criterion.name}
                </h3>
              </div>
            </div>

            {/* Tipo e Peso */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="bg-background/50">
                {criterion.scoreType}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Peso:</span>
                <div className={`h-2 w-10 rounded-full ${getWeightColor(criterion.weight)}`} />
                <span className="font-bold text-foreground">{criterion.weight}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {criterion.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-background/60">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Em Uso */}
            <div className="text-xs text-muted-foreground pt-3 border-t border-border/50">
              {criterion.companiesUsing} empresas • {criterion.modelsUsing} modelos
            </div>

            {/* Status e Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Badge 
                variant={criterion.status === "Ativo" ? "default" : "secondary"}
                className={criterion.status === "Ativo" ? "bg-green-600" : ""}
              >
                {criterion.status}
              </Badge>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-background/80"
                  onClick={() => onEdit(criterion)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-background/80"
                  onClick={() => onDuplicate(criterion)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-background/80"
                  onClick={() => onView(criterion)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CriteriaCards;
