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
  ChevronDown,
  ChevronRight,
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
  const [isExpanded, setIsExpanded] = useState(true);
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
      {/* Ambiente (nível 1) - Laranja - COMPACTO */}
      <Card className="hover:shadow-md transition-shadow border-orange-500/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Botão de Expandir/Colapsar */}
              {locations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              <h3 className="font-semibold text-base">{environment.name}</h3>
              <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/30">
                Ambiente
              </Badge>
              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {environment.audits_count} aud • {format(new Date(environment.created_at), "dd/MM/yy")} • {locations.length} loc
              </span>
            </div>
            
            {/* Botões compactos inline */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(environment)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-green-700 hover:bg-green-500/10"
                onClick={() => onAddLocation(environment.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setDeletingId(environment.id);
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locais (nível 2) - Verde - SUPER COMPACTOS */}
      {locations.length > 0 && isExpanded && (
        <div className="ml-4 space-y-1 border-l border-green-500/30 pl-2">
          {locations.map((location) => {
            const LocationIcon = iconMap[location.icon] || Eye;
            const isLocationActive = location.status === "active";

            return (
              <Card key={location.id} className="hover:shadow-sm transition-shadow border-green-500/20">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium text-sm">{location.name}</span>
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                      Local
                    </Badge>
                    <Badge variant={isLocationActive ? "default" : "secondary"} className="text-xs">
                      {isLocationActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {location.audits_count} aud
                    </span>
                  </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(location)}
                      >
                        <Pencil className="h-3 w-3" />
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
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
