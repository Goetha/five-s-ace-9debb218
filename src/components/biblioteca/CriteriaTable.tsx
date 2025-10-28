import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Copy, Eye, MoreVertical } from "lucide-react";
import { Criteria, SensoType } from "@/types/criteria";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface CriteriaTableProps {
  criteria: Criteria[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
}

const CriteriaTable = ({
  criteria,
  selectedIds,
  onSelectAll,
  onSelectOne,
}: CriteriaTableProps) => {
  const { toast } = useToast();
  const allSelected = criteria.length > 0 && selectedIds.length === criteria.length;

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

  const getWeightColor = (weight: number) => {
    if (weight >= 8) return "bg-error";
    if (weight >= 4) return "bg-warning";
    return "bg-success";
  };

  if (criteria.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">
          Nenhum critério encontrado com os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="min-w-[250px]">Nome do Critério</TableHead>
              <TableHead>Senso</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="min-w-[150px]">Peso</TableHead>
              <TableHead className="hidden lg:table-cell">Tags</TableHead>
              <TableHead className="hidden xl:table-cell">Em Uso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(checked) =>
                      onSelectOne(item.id, checked as boolean)
                    }
                    aria-label={`Selecionar ${item.name}`}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.id}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge className={getSensoColor(item.senso)}>
                    {item.senso}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.scoreType}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={item.weight * 10}
                      className="h-2 w-20"
                      indicatorClassName={getWeightColor(item.weight)}
                    />
                    <span className="text-sm font-medium w-6">{item.weight}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground hover:text-primary cursor-pointer">
                  {item.companiesUsing} empresas, {item.modelsUsing} modelos
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === "Ativo" ? "default" : "secondary"}
                    className={
                      item.status === "Ativo"
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {item.status === "Ativo" ? "🟢" : "🔴"} {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      aria-label={`Editar ${item.name}`}
                      onClick={() =>
                        toast({
                          title: "Editar critério",
                          description: `${item.id} — ${item.name}`,
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Duplicar"
                      aria-label={`Duplicar ${item.name}`}
                      onClick={() =>
                        toast({
                          title: "Cópia criada",
                          description: `Critério duplicado: ${item.name}`,
                        })
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Visualizar"
                      aria-label={`Visualizar ${item.name}`}
                      onClick={() =>
                        toast({
                          title: "Visualizar critério",
                          description: `${item.id} — ${item.name}`,
                        })
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Mais opções"
                          aria-label={`Mais opções para ${item.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => toast({ title: "Editar", description: item.name })}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "Duplicar", description: item.name })}>
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "Visualizar", description: item.name })}>
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            toast({
                              title: "Em uso",
                              description: `${item.companiesUsing} empresas, ${item.modelsUsing} modelos`,
                            })
                          }
                        >
                          Ver uso
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CriteriaTable;
