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
  const getSensoColor = (senso: string) => {
    const colors = {
      "1S": "bg-red-500",
      "2S": "bg-orange-500",
      "3S": "bg-yellow-500",
      "4S": "bg-green-500",
      "5S": "bg-blue-500",
    };
    return colors[senso as keyof typeof colors] || "bg-gray-500";
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
        <Card key={criterion.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-4">
            {/* Header com checkbox e actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selectedIds.includes(criterion.id)}
                  onCheckedChange={(checked) =>
                    onSelectOne(criterion.id, checked === true)
                  }
                  className="mt-1"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {criterion.id}
                    </span>
                    <Badge className={getSensoColor(criterion.senso)}>
                      {criterion.senso}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm leading-tight">
                    {criterion.name}
                  </h3>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(criterion)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(criterion)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(criterion)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tipo e Peso */}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{criterion.scoreType}</Badge>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Peso:</span>
                <div className={`h-2 w-8 rounded ${getWeightColor(criterion.weight)}`} />
                <span className="font-semibold">{criterion.weight}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {criterion.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Em Uso */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {criterion.companiesUsing} empresas, {criterion.modelsUsing} modelos
            </div>

            {/* Status e Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Badge variant={criterion.status === "Ativo" ? "default" : "secondary"}>
                {criterion.status}
              </Badge>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(criterion)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDuplicate(criterion)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
