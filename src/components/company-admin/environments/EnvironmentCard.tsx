import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Factory,
  Package,
  Utensils,
  Wrench,
  Briefcase,
  Cog,
  MapPin,
  Layers,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  MapPin,
  Layers,
};

export function EnvironmentCard({ environment, locations, onEdit, onAddLocation, onRefresh }: EnvironmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; level: number } | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});

  const IconComponent = iconMap[environment.icon as keyof typeof iconMap] || Building2;
  const { toast } = useToast();
  
  // Determine hierarchy level
  // Level 1: Area (direct child of root)
  // Level 2: Environment (child of area)
  // Level 3: Local (child of environment)
  const getLevel = (env: typeof environment): number => {
    console.log('🔍 getLevel for:', env.name, 'parent_id:', env.parent_id);
    if (!env.parent_id) {
      console.log('  → Level 0 (Root)');
      return 0;
    }

    // Conta quantos níveis até chegar na raiz (empresa)
    let level = 1; // Já sabemos que tem um pai
    let parentId: string | null | undefined = env.parent_id;

    while (parentId) {
      const parent = locations?.find((l) => l.id === parentId);
      console.log('  → Looking for parent:', parentId, 'Found:', parent?.name);
      if (!parent || !parent.parent_id) {
        // Chegou na raiz ou não encontrou mais ancestrais
        console.log('  → Reached root, final level:', level);
        break;
      }

      level++;
      parentId = parent.parent_id;
    }

    console.log('  → Final level:', level, 'for', env.name);
    return level; // 1 = Área, 2 = Ambiente, 3 = Local
  };
  
  const level = getLevel(environment);
  const typeLabel = level === 1 ? 'Área' : level === 2 ? 'Ambiente' : 'Local';
  const typeBadgeColor = level === 1 
    ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' 
    : level === 2
    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
  
  // Group locations by level
  const childEnvironments = locations?.filter(l => l.parent_id === environment.id) || [];
  const grandchildLocations = locations?.filter(l => {
    const parent = locations?.find(p => p.id === l.parent_id);
    return parent && parent.parent_id === environment.id;
  }) || [];

  const handleDelete = async (id: string, level: number) => {
    try {
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const levelName = level === 1 ? 'Área' : level === 2 ? 'Ambiente' : 'Local';
      toast({
        title: `${levelName} excluído com sucesso!`,
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Info Section */}
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base sm:text-lg truncate">{environment.name}</CardTitle>
                <Badge variant="outline" className={`${typeBadgeColor} border text-xs shrink-0`}>
                  {typeLabel}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {environment.audits_count || 0} auditorias
              </p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(environment)}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
            >
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            
            {level < 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddLocation(environment.id)}
                className="h-8 sm:h-9"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs sm:text-sm">{level === 1 ? 'Ambiente' : 'Local'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setItemToDelete({ id: environment.id, name: environment.name, level });
                setShowDeleteDialog(true);
              }}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
            </Button>
            
            {childEnvironments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{childEnvironments.length} {level === 1 ? 'ambientes' : 'locais'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">Criado em {new Date(environment.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Child Environments/Locations List */}
        {isExpanded && childEnvironments.length > 0 && (
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 pl-2 sm:pl-4">
            {childEnvironments.map((child) => {
              const ChildIcon = iconMap[child.icon as keyof typeof iconMap] || MapPin;
              const childLevel = getLevel(child);
              const childTypeLabel = childLevel === 1 ? 'Área' : childLevel === 2 ? 'Ambiente' : 'Local';
              const childBadgeColor = childLevel === 1 
                ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' 
                : childLevel === 2 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
              
              const grandchildren = locations?.filter(l => l.parent_id === child.id) || [];
              const isChildExpanded = expandedChildren[child.id] ?? true;

              return (
                <div key={child.id} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 bg-background rounded shrink-0">
                        <ChildIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{child.name}</span>
                          <Badge variant="outline" className={`${childBadgeColor} text-[10px] sm:text-xs shrink-0`}>
                            {childTypeLabel}
                          </Badge>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {child.audits_count || 0} auditorias
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(child)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                      {childLevel < 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddLocation(child.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      )}
                      {grandchildren.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedChildren((prev) => ({
                              ...prev,
                              [child.id]: !isChildExpanded,
                            }))
                          }
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          {isChildExpanded ? (
                            <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItemToDelete({ id: child.id, name: child.name, level: childLevel });
                          setShowDeleteDialog(true);
                        }}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Grandchildren (Locais within Ambientes) */}
                  {isChildExpanded && grandchildren.length > 0 && (
                    <div className="ml-4 sm:ml-8 space-y-1.5 pl-2 sm:pl-4">
                      {grandchildren.map((grandchild) => {
                        const GrandchildIcon = iconMap[grandchild.icon as keyof typeof iconMap] || MapPin;
                        return (
                          <div
                            key={grandchild.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <GrandchildIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-medium truncate">{grandchild.name}</span>
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[9px] sm:text-[10px] px-1 shrink-0">
                                    Local
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={() => onEdit(grandchild)}
                              >
                                <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={() => {
                                  setItemToDelete({ id: grandchild.id, name: grandchild.name, level: 3 });
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {itemToDelete?.level === 1 ? 'a área' : itemToDelete?.level === 2 ? 'o ambiente' : 'o local'}{' '}
              <span className="font-semibold">{itemToDelete?.name}</span>?
              {itemToDelete?.level === 1 && childEnvironments.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todos os {childEnvironments.length} ambientes e seus locais vinculados também serão excluídos.
                </span>
              )}
              {itemToDelete?.level === 2 && grandchildLocations.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todos os {grandchildLocations.length} locais vinculados também serão excluídos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDelete(itemToDelete.id, itemToDelete.level)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
