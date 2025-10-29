import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnvironmentCardProps {
  environment: Environment;
  subEnvironments: Environment[];
  onEdit: (env: Environment) => void;
  onAddSubEnvironment: (parentId: string) => void;
  onRefresh: () => void;
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

export function EnvironmentCard({ environment, subEnvironments, onEdit, onAddSubEnvironment, onRefresh }: EnvironmentCardProps) {
  const Icon = iconMap[environment.icon] || Building2;
  const isActive = environment.status === "active";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (envId: string, envName: string) => {
    try {
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', envId);

      if (error) {
        console.error("Error deleting environment:", error);
        toast({
          title: "Erro ao excluir",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✓ Ambiente excluído",
        description: `O ambiente "${envName}" foi removido.`,
      });

      onRefresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível excluir o ambiente.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

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
                  <DropdownMenuItem onClick={() => onEdit(environment)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddSubEnvironment(environment.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Sub-ambiente
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => {
                      setDeletingId(environment.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
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
            <Button variant="outline" size="sm" onClick={() => onEdit(environment)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-accent/20 hover:bg-accent/30"
              onClick={() => onAddSubEnvironment(environment.id)}
            >
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
                          <DropdownMenuItem onClick={() => onEdit(subEnv)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setDeletingId(subEnv.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ambiente? Esta ação não pode ser desfeita.
              {subEnvironments.some(s => s.id === deletingId) && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este é um sub-ambiente vinculado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deletingId) {
                  const envToDelete = deletingId === environment.id 
                    ? environment 
                    : subEnvironments.find(s => s.id === deletingId);
                  if (envToDelete) {
                    handleDelete(envToDelete.id, envToDelete.name);
                  }
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
