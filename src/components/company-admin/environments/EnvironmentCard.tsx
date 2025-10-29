import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Environment } from "@/types/environment";
import {
  Building2,
  Eye,
  Factory,
  MoreVertical,
  Pencil,
  Plus,
  Cog,
  Package,
  Utensils,
  Wrench,
  Briefcase,
  User,
  BarChart3,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EnvironmentCardProps {
  environment: Environment;
  subEnvironments: Environment[];
}

const iconMap: Record<string, typeof Factory> = {
  Factory,
  Building2,
  Package,
  Utensils,
  Wrench,
  Briefcase,
  Cog,
};

export function EnvironmentCard({ environment, subEnvironments }: EnvironmentCardProps) {
  const Icon = iconMap[environment.icon] || Building2;
  const isActive = environment.status === "active";

  return (
    <div className="space-y-2">
      {/* Parent Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{environment.name}</h3>
                {environment.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {environment.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                Responsável: <span className="font-medium text-foreground">{environment.responsible_name}</span>
                {" "}({environment.responsible_email})
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>{environment.audits_count} auditorias realizadas</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Criado em: {format(new Date(environment.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="bg-accent/20 hover:bg-accent/30">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Sub-ambiente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sub-environments */}
      {subEnvironments.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
          {subEnvironments.map((subEnv) => {
            const SubIcon = iconMap[subEnv.icon] || Cog;
            const isSubActive = subEnv.status === "active";

            return (
              <Card key={subEnv.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <SubIcon className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{subEnv.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Resp: {subEnv.responsible_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {subEnv.audits_count} auditorias
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Badge
                        variant={isSubActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isSubActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
