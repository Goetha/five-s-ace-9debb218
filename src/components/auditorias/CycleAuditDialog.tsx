import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Lock, 
  Play,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import type { AuditCycleWithDetails, CycleLocation } from "@/types/auditCycle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CycleAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  cycleId: string | null;
  onCycleUpdated: () => void;
}

interface LocationGroup {
  areaId: string;
  areaName: string;
  environments: {
    envId: string;
    envName: string;
    locations: CycleLocation[];
  }[];
}

export function CycleAuditDialog({ 
  open, 
  onOpenChange, 
  companyId,
  companyName,
  cycleId,
  onCycleUpdated
}: CycleAuditDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [cycle, setCycle] = useState<AuditCycleWithDetails | null>(null);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyId) {
      loadData();
    }
  }, [open, companyId, cycleId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch or get existing cycle
      let activeCycle: AuditCycleWithDetails | null = null;
      
      if (cycleId) {
        const { data, error } = await supabase
          .from('audit_cycles')
          .select('*')
          .eq('id', cycleId)
          .single();
        
        if (error) throw error;
        activeCycle = data as AuditCycleWithDetails;
      }

      // 2. Fetch all environments for this company
      const { data: envData, error: envError } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (envError) throw envError;

      console.log('📍 Environments loaded:', envData?.length);

      // 3. Fetch all environment_criteria to know which locations have criteria
      const { data: criteriaLinks, error: criteriaError } = await supabase
        .from('environment_criteria')
        .select('environment_id');
      
      if (criteriaError) throw criteriaError;

      // Create set of locations with criteria
      const locationsWithCriteriaSet = new Set(criteriaLinks?.map(l => l.environment_id) || []);
      console.log('📋 Locations with criteria:', locationsWithCriteriaSet.size);

      // Build hierarchy maps
      const envMap = new Map(envData?.map(e => [e.id, e]) || []);
      const childrenByParent = new Map<string, any[]>();
      
      for (const e of envData || []) {
        if (!e.parent_id) continue;
        const arr = childrenByParent.get(e.parent_id) || [];
        arr.push(e);
        childrenByParent.set(e.parent_id, arr);
      }

      // Find root
      const root = envData?.find(e => !e.parent_id);
      console.log('🏠 Root found:', root?.name);
      
      if (!root) {
        setLocationGroups([]);
        setCycle(activeCycle);
        setIsLoading(false);
        return;
      }

      // 4. Fetch already audited locations in this cycle
      let auditedLocationIds: string[] = [];
      if (activeCycle) {
        const { data: audits } = await supabase
          .from('audits')
          .select('location_id')
          .eq('cycle_id', activeCycle.id);
        
        auditedLocationIds = audits?.map(a => a.location_id) || [];
      }

      // 5. Build location groups (4-level: Root > Area > Environment > Location)
      const groups: LocationGroup[] = [];
      const areas = childrenByParent.get(root.id) || [];
      console.log('📁 Areas found:', areas.length);
      
      for (const area of areas) {
        const areaGroup: LocationGroup = {
          areaId: area.id,
          areaName: area.name,
          environments: []
        };

        const envs = childrenByParent.get(area.id) || [];
        for (const env of envs) {
          const locations = childrenByParent.get(env.id) || [];
          
          // Include all locations (show warning if no criteria)
          const locationsForEnv: CycleLocation[] = locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            area_name: area.name,
            environment_name: env.name,
            is_audited: auditedLocationIds.includes(loc.id),
            has_criteria: locationsWithCriteriaSet.has(loc.id)
          }));

          if (locationsForEnv.length > 0) {
            areaGroup.environments.push({
              envId: env.id,
              envName: env.name,
              locations: locationsForEnv
            });
          }
        }

        if (areaGroup.environments.length > 0) {
          groups.push(areaGroup);
        }
      }

      console.log('📊 Location groups:', groups.length);

      // Update cycle with location counts
      const totalLocations = groups.reduce((acc, g) => 
        acc + g.environments.reduce((e, env) => e + env.locations.filter(l => (l as any).has_criteria).length, 0), 0);
      const completedLocations = groups.reduce((acc, g) => 
        acc + g.environments.reduce((e, env) => e + env.locations.filter(l => l.is_audited).length, 0), 0);

      if (activeCycle) {
        activeCycle.total_locations = totalLocations;
        activeCycle.completed_locations = completedLocations;
        activeCycle.audited_location_ids = auditedLocationIds;
      }

      setLocationGroups(groups);
      setCycle(activeCycle);
      
      // Auto-expand all areas if few
      if (groups.length <= 3) {
        setExpandedAreas(new Set(groups.map(g => g.areaId)));
      } else {
        // Auto-expand first area with pending locations
        const firstPendingArea = groups.find(g => 
          g.environments.some(e => e.locations.some(l => !l.is_audited && (l as any).has_criteria)));
        if (firstPendingArea) {
          setExpandedAreas(new Set([firstPendingArea.areaId]));
        }
      }

    } catch (error: any) {
      console.error('Error loading cycle data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAudit = async (locationId: string) => {
    if (!user) return;
    
    setIsCreating(true);
    setSelectedLocation(locationId);
    
    try {
      // 1. Create or get cycle
      let activeCycleId = cycleId;
      
      if (!activeCycleId) {
        // Calculate total locations with criteria
        const totalLocations = locationGroups.reduce((acc, g) => 
          acc + g.environments.reduce((e, env) => e + env.locations.filter(l => (l as any).has_criteria).length, 0), 0);

        const { data: newCycle, error: cycleError } = await supabase
          .from('audit_cycles')
          .insert({
            company_id: companyId,
            auditor_id: user.id,
            total_locations: totalLocations,
            completed_locations: 0,
            status: 'in_progress'
          })
          .select()
          .single();
        
        if (cycleError) throw cycleError;
        activeCycleId = newCycle.id;
      }

      // 2. Create audit with cycle reference
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .insert({
          company_id: companyId,
          location_id: locationId,
          auditor_id: user.id,
          cycle_id: activeCycleId,
          status: 'in_progress'
        })
        .select()
        .single();

      if (auditError) throw auditError;

      // 3. Fetch criteria linked to this location
      const { data: criteriaLinks, error: criteriaError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', locationId);

      if (criteriaError) throw criteriaError;

      if (!criteriaLinks || criteriaLinks.length === 0) {
        throw new Error('Nenhum critério vinculado a este local.');
      }

      // 4. Fetch criteria details
      const { data: criteria, error: fetchError } = await supabase
        .from('company_criteria')
        .select('id, name')
        .in('id', criteriaLinks.map(link => link.criterion_id))
        .eq('status', 'active');

      if (fetchError) throw fetchError;

      if (!criteria || criteria.length === 0) {
        throw new Error('Nenhum critério ativo vinculado a este local.');
      }

      // 5. Create audit items
      const auditItems = criteria.map(criterion => ({
        audit_id: audit.id,
        criterion_id: criterion.id,
        question: criterion.name,
        answer: null
      }));

      const { error: itemsError } = await supabase
        .from('audit_items')
        .insert(auditItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Auditoria criada!",
        description: "Redirecionando para o checklist..."
      });

      onOpenChange(false);
      onCycleUpdated();
      navigate(`/auditor/auditoria/${audit.id}`);
      
    } catch (error: any) {
      console.error('Error creating audit:', error);
      toast({
        title: "Erro ao criar auditoria",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      setSelectedLocation(null);
    }
  };

  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  const progress = cycle 
    ? Math.round((cycle.completed_locations / Math.max(cycle.total_locations, 1)) * 100) 
    : 0;

  const pendingCount = locationGroups.reduce((acc, g) => 
    acc + g.environments.reduce((e, env) => e + env.locations.filter(l => !l.is_audited && (l as any).has_criteria).length, 0), 0);

  const totalWithCriteria = locationGroups.reduce((acc, g) => 
    acc + g.environments.reduce((e, env) => e + env.locations.filter(l => (l as any).has_criteria).length, 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-full sm:h-auto sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[600px] p-0 flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 sm:p-6 pb-3 flex-shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {cycleId ? 'Continuar Ciclo' : 'Novo Ciclo de Auditoria'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {companyName}
          </DialogDescription>
          
          {cycle && totalWithCriteria > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {cycle.completed_locations}/{totalWithCriteria} locais
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : locationGroups.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground font-medium">
                Nenhum local encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure a hierarquia de ambientes (Área → Ambiente → Local) primeiro
              </p>
            </div>
          ) : totalWithCriteria === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
              <p className="mt-4 text-foreground font-medium">
                Nenhum critério vinculado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Vincule critérios aos locais através do gerenciamento de ambientes
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {/* Stats summary */}
              <div className="flex gap-3 pb-3 border-b">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {cycle?.completed_locations || 0} avaliados
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <MapPin className="h-3 w-3 mr-1" />
                  {pendingCount} pendentes
                </Badge>
              </div>

              {/* Location hierarchy */}
              {locationGroups.map((group) => {
                const groupPendingCount = group.environments.reduce(
                  (e, env) => e + env.locations.filter(l => !l.is_audited && (l as any).has_criteria).length, 0
                );
                
                return (
                  <Collapsible 
                    key={group.areaId} 
                    open={expandedAreas.has(group.areaId)}
                    onOpenChange={() => toggleArea(group.areaId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedAreas.has(group.areaId) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">{group.areaName}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {groupPendingCount} pendentes
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="pl-4 pt-2 space-y-2">
                        {group.environments.map((env) => (
                          <div key={env.envId} className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground pl-2">
                              {env.envName}
                            </p>
                            <div className="space-y-1">
                              {env.locations.map((loc) => {
                                const hasCriteria = (loc as any).has_criteria;
                                
                                return (
                                  <div 
                                    key={loc.id}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                      loc.is_audited 
                                        ? 'bg-green-50/50 border-green-200' 
                                        : !hasCriteria
                                        ? 'bg-muted/30 border-muted'
                                        : 'bg-background hover:bg-primary/5 border-border'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {loc.is_audited ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      ) : !hasCriteria ? (
                                        <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      ) : (
                                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                      )}
                                      <span className={`text-sm truncate ${
                                        loc.is_audited ? 'text-green-700' : !hasCriteria ? 'text-muted-foreground' : ''
                                      }`}>
                                        {loc.name}
                                      </span>
                                    </div>
                                    
                                    {loc.is_audited ? (
                                      <Badge variant="outline" className="text-green-600 border-green-300 text-xs flex-shrink-0">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Avaliado
                                      </Badge>
                                    ) : !hasCriteria ? (
                                      <Badge variant="outline" className="text-muted-foreground text-xs flex-shrink-0">
                                        Sem critérios
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 text-xs flex-shrink-0"
                                        onClick={() => handleStartAudit(loc.id)}
                                        disabled={isCreating}
                                      >
                                        {isCreating && selectedLocation === loc.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Play className="h-3 w-3 mr-1" />
                                            Avaliar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 sm:p-6 pt-3 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
            disabled={isCreating}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
