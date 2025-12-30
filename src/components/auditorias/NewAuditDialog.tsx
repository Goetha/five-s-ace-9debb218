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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, WifiOff, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OfflineAwareSelect } from "@/components/ui/offline-aware-select";
import { useOfflineEnvironments } from "@/hooks/useOfflineEnvironments";
import {
  getCachedEnvironmentCriteriaByEnvId,
  getCachedCriteriaByCompanyId,
  createOfflineAudit,
} from "@/lib/offlineStorage";

interface NewAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCompanyId: string;
  preSelectedCompanyName: string;
}

export function NewAuditDialog({ 
  open, 
  onOpenChange, 
  preSelectedCompanyId,
  preSelectedCompanyName 
}: NewAuditDialogProps) {
  const navigate = useNavigate();
  const { user, isOffline } = useAuth();
  const { toast } = useToast();
  
  const {
    getAreas,
    getEnvironments,
    getLocations,
    isLoading,
    isFromCache,
    refetch,
  } = useOfflineEnvironments(user?.id, preSelectedCompanyId);

  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [criteriaCount, setCriteriaCount] = useState<number>(0);
  const [criteriaData, setCriteriaData] = useState<Array<{ id: string; name: string; senso?: string[] | null }>>([]);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Get filtered data based on selections
  const areas = preSelectedCompanyId ? getAreas(preSelectedCompanyId) : [];
  const environments = selectedArea ? getEnvironments(selectedArea) : [];
  const locations = selectedEnvironment ? getLocations(selectedEnvironment) : [];

  useEffect(() => {
    if (open) {
      console.log('[NewAuditDialog] Opening modal, companyId:', preSelectedCompanyId);
      // Reset selections when opening
      setSelectedArea("");
      setSelectedEnvironment("");
      setSelectedLocation("");
      setSelectedLocationName("");
      setCriteriaCount(0);
      setCriteriaData([]);
      
      // Force refetch environments when modal opens
      if (preSelectedCompanyId) {
        console.log('[NewAuditDialog] Forcing refetch for company:', preSelectedCompanyId);
        refetch();
      }
    }
  }, [open, preSelectedCompanyId, refetch]);

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedEnvironment("");
    setSelectedLocation("");
    setSelectedLocationName("");
    setCriteriaCount(0);
    setCriteriaData([]);
  };

  const handleEnvironmentChange = (value: string) => {
    setSelectedEnvironment(value);
    setSelectedLocation("");
    setSelectedLocationName("");
    setCriteriaCount(0);
    setCriteriaData([]);
  };

  const handleLocationChange = async (value: string) => {
    setSelectedLocation(value);
    const location = locations.find(l => l.id === value);
    setSelectedLocationName(location?.name || '');
    setIsLoadingCriteria(true);
    
    try {
      let loadedCriteria: Array<{ id: string; name: string; senso?: string[] | null }> = [];

      if (navigator.onLine) {
        // Online: fetch from server
        const { data: criteriaLinks, error } = await supabase
          .from('environment_criteria')
          .select('criterion_id')
          .eq('environment_id', value);

        if (error) throw error;

        if (criteriaLinks && criteriaLinks.length > 0) {
          const { data: criteria, error: criteriaError } = await supabase
            .from('company_criteria')
            .select('id, name, senso')
            .in('id', criteriaLinks.map(link => link.criterion_id))
            .eq('status', 'active');

          if (criteriaError) throw criteriaError;
          loadedCriteria = criteria || [];
        }
      } else {
        // Offline: use cached data
        const cachedEnvCriteria = await getCachedEnvironmentCriteriaByEnvId(value);
        const cachedCriteria = await getCachedCriteriaByCompanyId(preSelectedCompanyId);
        
        const linkedCriterionIds = cachedEnvCriteria.map(ec => ec.criterion_id);
        loadedCriteria = cachedCriteria
          .filter(c => linkedCriterionIds.includes(c.id) && c.status === 'active')
          .map(c => ({ id: c.id, name: c.name, senso: c.senso }));
      }

      setCriteriaData(loadedCriteria);
      setCriteriaCount(loadedCriteria.length);
    } catch (error) {
      console.error('Error loading criteria:', error);
      toast({
        title: "Erro ao carregar critérios",
        description: "Não foi possível carregar os critérios.",
        variant: "destructive"
      });
      setCriteriaCount(0);
      setCriteriaData([]);
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  const handleStartAudit = async () => {
    if (!selectedLocation || !user) return;

    setIsCreating(true);
    try {
      if (isOffline) {
        // OFFLINE: Create audit locally
        if (criteriaData.length === 0) {
          throw new Error('Nenhum critério disponível para esta auditoria.');
        }

        const auditData = {
          company_id: preSelectedCompanyId,
          location_id: selectedLocation,
          auditor_id: user.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          total_questions: criteriaData.length,
          total_yes: 0,
          total_no: 0,
          score: null,
          _locationName: selectedLocationName,
          _companyName: preSelectedCompanyName,
        };

        const items = criteriaData.map(c => ({
          criterion_id: c.id,
          question: c.name,
          senso: c.senso,
        }));

        const { audit } = await createOfflineAudit(auditData, items);

        toast({
          title: "Auditoria criada offline",
          description: "Será sincronizada quando você voltar online.",
        });

        onOpenChange(false);
        navigate(`/auditor/auditoria/${audit.id}`);
      } else {
        // ONLINE: Create on server
        const { data: audit, error: auditError } = await supabase
          .from('audits')
          .insert({
            company_id: preSelectedCompanyId,
            location_id: selectedLocation,
            auditor_id: user.id,
            status: 'in_progress'
          })
          .select()
          .single();

        if (auditError) throw auditError;

        // Buscar critérios vinculados ao local específico
        const { data: criteriaLinks, error: criteriaError } = await supabase
          .from('environment_criteria')
          .select('criterion_id')
          .eq('environment_id', selectedLocation);

        if (criteriaError) throw criteriaError;

        if (!criteriaLinks || criteriaLinks.length === 0) {
          throw new Error('Nenhum critério vinculado a este local.');
        }

        // Buscar detalhes dos critérios
        const { data: criteria, error: fetchError } = await supabase
          .from('company_criteria')
          .select('id, name')
          .in('id', criteriaLinks.map(link => link.criterion_id))
          .eq('status', 'active');

        if (fetchError) throw fetchError;

        if (!criteria || criteria.length === 0) {
          throw new Error('Nenhum critério ativo vinculado a este local.');
        }

        // Criar itens de auditoria
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
          title: "Auditoria criada com sucesso!",
          description: "Redirecionando para o checklist..."
        });

        onOpenChange(false);
        navigate(`/auditor/auditoria/${audit.id}`);
      }
    } catch (error: any) {
      console.error('Error creating audit:', error);
      toast({
        title: "Erro ao criar auditoria",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] w-[95vw] sm:max-w-[500px] p-4 sm:p-6 flex flex-col overflow-hidden" 
        aria-describedby="new-audit-description"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl">Nova Auditoria</DialogTitle>
            {(isOffline || isFromCache) && (
              <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                {isOffline ? (
                  <>
                    <CloudOff className="h-3 w-3" />
                    Offline
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Cache
                  </>
                )}
              </Badge>
            )}
          </div>
          <DialogDescription id="new-audit-description" className="text-sm">
            Selecione o ambiente e local para iniciar a auditoria
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-2 sm:py-4 pr-1">
          {/* Empresa (pré-selecionada) */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-sm">Empresa</Label>
            <div className="p-2.5 sm:p-3 bg-primary/5 border border-primary/20 rounded-md">
              <p className="font-medium text-primary text-sm sm:text-base">{preSelectedCompanyName}</p>
            </div>
          </div>

          {/* Área */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="area" className="text-sm">Área *</Label>
            <OfflineAwareSelect
              value={selectedArea}
              onValueChange={handleAreaChange}
              placeholder="Selecione a área"
              items={areas}
              isLoading={isLoading}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(a) => a.id}
              getItemLabel={(a) => a.name}
              className="w-full"
            />
          </div>

          {/* Ambiente */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="environment" className="text-sm">Ambiente *</Label>
            <OfflineAwareSelect
              value={selectedEnvironment}
              onValueChange={handleEnvironmentChange}
              placeholder={
                !selectedArea 
                  ? "Selecione uma área primeiro" 
                  : environments.length === 0 
                  ? "Nenhum ambiente disponível" 
                  : "Selecione o ambiente"
              }
              items={environments}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(e) => e.id}
              getItemLabel={(e) => e.name}
              disabled={!selectedArea || environments.length === 0}
              className="w-full"
            />
          </div>

          {/* Local */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="location" className="text-sm">Local *</Label>
            <OfflineAwareSelect
              value={selectedLocation}
              onValueChange={handleLocationChange}
              placeholder={
                !selectedEnvironment 
                  ? "Selecione um ambiente primeiro" 
                  : locations.length === 0 
                  ? "Nenhum local disponível" 
                  : "Selecione o local"
              }
              items={locations}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(l) => l.id}
              getItemLabel={(l) => l.name}
              disabled={!selectedEnvironment || locations.length === 0}
              className="w-full"
            />
          </div>

          {/* Preview de Critérios */}
          {selectedLocation && (
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
              {isLoadingCriteria ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando critérios...
                </div>
              ) : criteriaCount > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                    Esta auditoria terá {criteriaCount} {criteriaCount === 1 ? 'pergunta' : 'perguntas'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">Nenhum critério disponível</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-500">
                    Não há critérios ativos configurados para este local.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLocationChange(selectedLocation)}
                    className="text-xs h-7 sm:h-8"
                  >
                    <Loader2 className="h-3 w-3 mr-1" />
                    Recarregar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Offline info */}
          {isOffline && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">Modo offline</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                A auditoria será salva localmente e sincronizada quando você voltar online.
              </p>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t mt-auto flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="h-9 sm:h-10 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStartAudit}
            disabled={!selectedLocation || isCreating || criteriaCount === 0}
            className="h-9 sm:h-10 text-sm"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {criteriaCount === 0 ? 'Sem critérios' : isOffline ? 'Iniciar Offline' : 'Iniciar Auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}