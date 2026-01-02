import { useState, useEffect, useMemo } from "react";
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
import { Loader2, CheckCircle2, AlertCircle, CloudOff, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOfflineEnvironments,
  useOfflineEnvironmentCriteria,
} from "@/hooks/useOfflineQuery";
import {
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
  
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Use offline-aware hook for environments
  const { 
    data: environments = [], 
    isLoading: isLoadingEnvs,
    isFromCache: envsFromCache,
  } = useOfflineEnvironments(open ? preSelectedCompanyId : undefined);

  // Use offline-aware hook for criteria (only when location is selected)
  const {
    data: criteriaData = [],
    isLoading: isLoadingCriteria,
    isFromCache: criteriaFromCache,
  } = useOfflineEnvironmentCriteria(selectedLocation || undefined);

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedArea("");
      setSelectedEnvironment("");
      setSelectedLocation("");
      setSelectedLocationName("");
    }
  }, [open, preSelectedCompanyId]);

  // Hierarquia: root (parent_id = null) -> áreas (parent_id = root) -> ambientes -> locais
  const rootEnv = useMemo(() => 
    environments.find(e => e.parent_id === null), 
    [environments]
  );
  
  const areas = useMemo(() => 
    rootEnv ? environments.filter(e => e.parent_id === rootEnv.id) : [],
    [environments, rootEnv]
  );
  
  const envs = useMemo(() => 
    selectedArea ? environments.filter(e => e.parent_id === selectedArea) : [],
    [environments, selectedArea]
  );
  
  const locations = useMemo(() => 
    selectedEnvironment ? environments.filter(e => e.parent_id === selectedEnvironment) : [],
    [environments, selectedEnvironment]
  );

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedEnvironment("");
    setSelectedLocation("");
    setSelectedLocationName("");
  };

  const handleEnvironmentChange = (value: string) => {
    setSelectedEnvironment(value);
    setSelectedLocation("");
    setSelectedLocationName("");
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    const location = locations.find(l => l.id === value);
    setSelectedLocationName(location?.name || '');
  };

  const handleStartAudit = async () => {
    if (!selectedLocation || !user) return;

    setIsCreating(true);
    try {
      if (isOffline) {
        // Create offline audit
        const { audit } = await createOfflineAudit(
          {
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
          },
          criteriaData.map(c => ({
            criterion_id: c.id,
            question: c.name,
            senso: c.senso,
          }))
        );

        toast({
          title: "Auditoria criada offline",
          description: "Os dados serão sincronizados quando você voltar online."
        });

        onOpenChange(false);
        navigate(`/auditor/auditoria/${audit.id}`);
      } else {
        // Create online audit (existing logic)
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

        if (!criteriaData || criteriaData.length === 0) {
          throw new Error('Nenhum critério vinculado a este local.');
        }

        const auditItems = criteriaData.map(criterion => ({
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

  const isUsingCache = envsFromCache || criteriaFromCache;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] w-[95vw] sm:max-w-[500px] p-4 sm:p-6 flex flex-col overflow-hidden" 
        aria-describedby="new-audit-description"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl">Nova Auditoria</DialogTitle>
            <div className="flex gap-1">
              {isUsingCache && (
                <Badge variant="outline" className="gap-1 text-blue-500 border-blue-500/30">
                  <Database className="h-3 w-3" />
                  Cache
                </Badge>
              )}
              {isOffline && (
                <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                  <CloudOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
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
            <Select value={selectedArea} onValueChange={handleAreaChange} disabled={isLoadingEnvs}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingEnvs ? "Carregando..." : areas.length === 0 ? "Nenhuma área disponível" : "Selecione a área"} />
              </SelectTrigger>
              <SelectContent>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ambiente */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="environment" className="text-sm">Ambiente *</Label>
            <Select 
              value={selectedEnvironment} 
              onValueChange={handleEnvironmentChange} 
              disabled={!selectedArea || envs.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !selectedArea 
                    ? "Selecione uma área primeiro" 
                    : envs.length === 0 
                    ? "Nenhum ambiente disponível" 
                    : "Selecione o ambiente"
                } />
              </SelectTrigger>
              <SelectContent>
                {envs.map(env => (
                  <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Local */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="location" className="text-sm">Local *</Label>
            <Select 
              value={selectedLocation} 
              onValueChange={handleLocationChange} 
              disabled={!selectedEnvironment || locations.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !selectedEnvironment 
                    ? "Selecione um ambiente primeiro" 
                    : locations.length === 0 
                    ? "Nenhum local disponível" 
                    : "Selecione o local"
                } />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview de Critérios */}
          {selectedLocation && (
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
              {isLoadingCriteria ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando critérios...
                </div>
              ) : criteriaData.length > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                    Esta auditoria terá {criteriaData.length} {criteriaData.length === 1 ? 'pergunta' : 'perguntas'}
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
                </div>
              )}
            </div>
          )}

          {/* Offline info - now shows that offline IS supported */}
          {isOffline && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">Modo offline ativo</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Você pode criar auditorias offline. Os dados serão sincronizados quando voltar online.
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
            disabled={!selectedLocation || isCreating || criteriaData.length === 0}
            className="h-9 sm:h-10 text-sm"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {criteriaData.length === 0 ? 'Sem critérios' : isOffline ? 'Iniciar Offline' : 'Iniciar Auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
