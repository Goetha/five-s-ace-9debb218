import { MoreVertical, Eye, Edit, Link as LinkIcon, Calendar, RefreshCw, Building, Copy, Download, BarChart, Trash2, List, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MasterModel } from "@/types/model";
import { formatDate, getTimeAgo } from "@/lib/formatters";

interface ModelCardProps {
  model: MasterModel;
  onViewDetails: () => void;
  onEdit: () => void;
  onLink: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

const sensoColors: Record<string, string> = {
  "1S": "bg-red-100 text-red-700 border-red-300",
  "2S": "bg-orange-100 text-orange-700 border-orange-300",
  "3S": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "4S": "bg-green-100 text-green-700 border-green-300",
  "5S": "bg-blue-100 text-blue-700 border-blue-300",
};

const ModelCard = ({
  model,
  onViewDetails,
  onEdit,
  onLink,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: ModelCardProps) => {
  const isActive = model.status === "active";

  return (
    <Card 
      className={`transition-all hover:shadow-lg ${isActive ? "border-success/40" : "opacity-60 border-muted"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight break-words">{model.name}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Modelo
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Lista de Critérios
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart className="h-4 w-4 mr-2" />
                  Ver Estatísticas de Uso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleStatus}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isActive ? "Desativar" : "Ativar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Modelo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {model.description}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <List className="h-4 w-4" />
            <span className="font-medium">{model.total_criteria} critérios</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <Building className="h-4 w-4" />
            <span>{model.companies_using} empresas usando</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Criado em {formatDate(model.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Atualizado {getTimeAgo(model.updated_at)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Distribuição por Senso:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(model.criteria_by_senso).map(([senso, count]) => (
              <Badge
                key={senso}
                variant="outline"
                className={sensoColors[senso]}
              >
                {senso}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1 min-w-[120px]">
          <Eye className="h-4 w-4 mr-1" />
          Ver Detalhes
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 min-w-[100px]">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
        <Button variant="default" size="sm" onClick={onLink} className="flex-1 min-w-[120px]">
          <LinkIcon className="h-4 w-4 mr-1" />
          Vincular
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ModelCard;
