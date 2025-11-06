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
  locations: Environment[];
  onEdit: (env: Environment) => void;
  onAddLocation: (parentId: string) => void;
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

export function EnvironmentCard({ environment, locations, onEdit, onAddLocation, onRefresh }: EnvironmentCardProps) {
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
      {/* Ambiente (nível 1) - Laranja */}
      <Card className="hover:shadow-md transition-shadow border-orange-500/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Factory className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{environment.name}</h3>
                  <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/30">
                    Ambiente
                  </Badge>
                </div>
                {environment.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {environment.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
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
            {locations.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{locations.length} {locations.length === 1 ? 'local' : 'locais'}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(environment)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-green-500/10 hover:bg-green-500/20 text-green-700 border-green-500/30"
              onClick={() => onAddLocation(environment.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Local
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDeletingId(environment.id);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locais (nível 2) - Verde */}
      {locations.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-green-500/30 pl-4">
          {locations.map((location) => {
            const LocationIcon = iconMap[location.icon] || Eye;
            const isLocationActive = location.status === "active";

            return (
              <Card key={location.id} className="hover:shadow-sm transition-shadow border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <LocationIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{location.name}</h4>
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                            Local
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {location.audits_count} auditorias
                          </span>
                        </div>
                      </div>
                     </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(location)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeletingId(location.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                      <Badge
                        variant={isLocationActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isLocationActive ? "Ativo" : "Inativo"}
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
              Tem certeza que deseja excluir este {locations.some(s => s.id === deletingId) ? 'local' : 'ambiente'}? Esta ação não pode ser desfeita.
              {deletingId === environment.id && locations.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Atenção: Este ambiente possui {locations.length} {locations.length === 1 ? 'local' : 'locais'} vinculado(s) que também serão excluídos.
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
                    : locations.find(s => s.id === deletingId);
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
