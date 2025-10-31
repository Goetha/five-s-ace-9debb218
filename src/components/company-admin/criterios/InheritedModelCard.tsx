import { MoreVertical, Eye, Calendar, RefreshCw, List, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Criterion } from "@/types/criterion";
import { formatDate, getTimeAgo } from "@/lib/formatters";

interface InheritedModelCardProps {
  modelName: string;
  modelId: string;
  criteria: Criterion[];
  onViewCriterion: (criterion: Criterion) => void;
}

const sensoColors: Record<string, string> = {
  "1S": "bg-red-100 text-red-700 border-red-300",
  "2S": "bg-orange-100 text-orange-700 border-orange-300",
  "3S": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "4S": "bg-green-100 text-green-700 border-green-300",
  "5S": "bg-blue-100 text-blue-700 border-blue-300",
};

export const InheritedModelCard = ({
  modelName,
  modelId,
  criteria,
  onViewCriterion,
}: InheritedModelCardProps) => {
  const criteriaBysenso = {
    "1S": criteria.filter((c) => c.senso === "1S").length,
    "2S": criteria.filter((c) => c.senso === "2S").length,
    "3S": criteria.filter((c) => c.senso === "3S").length,
    "4S": criteria.filter((c) => c.senso === "4S").length,
    "5S": criteria.filter((c) => c.senso === "5S").length,
  };

  const firstCriterion = criteria[0];
  const linkedAt = firstCriterion?.linked_at;

  return (
    <Card className="transition-all hover:shadow-lg border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight break-words">{modelName}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-blue-100 text-blue-700 border-0">IFA</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos os Critérios
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <List className="h-4 w-4" />
            <span className="font-medium">{criteria.length} critérios herdados</span>
          </div>
          {linkedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Vinculado em {formatDate(linkedAt)}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 mb-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Distribuição por Senso:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(criteriaBysenso).map(([senso, count]) => (
              count > 0 && (
                <Badge
                  key={senso}
                  variant="outline"
                  className={sensoColors[senso]}
                >
                  {senso}: {count}
                </Badge>
              )
            ))}
          </div>
        </div>

        <div className="border-t pt-3 mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Critérios:</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {criteria.slice(0, 5).map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center justify-between gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => onViewCriterion(criterion)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge className={`${sensoColors[criterion.senso].split(' ')[0]} text-white text-xs flex-shrink-0`}>
                    {criterion.senso}
                  </Badge>
                  <span className="truncate">{criterion.name}</span>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Peso: {criterion.custom_weight}
                </Badge>
              </div>
            ))}
            {criteria.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{criteria.length - 5} critérios
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
          if (criteria.length > 0) onViewCriterion(criteria[0]);
        }}>
          <Eye className="h-4 w-4 mr-1" />
          Ver Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
};
