import { useState, useEffect, useMemo, Component, ReactNode } from "react";
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
import { Loader2, CheckCircle2, AlertCircle, CloudOff, Database, RefreshCw } from "lucide-react";
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

// Error Boundary for the dialog content
class DialogErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[NewAuditDialog] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="font-semibold text-lg">Erro ao carregar</h3>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || 'Ocorreu um erro inesperado.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    error: envsError,
  } = useOfflineEnvironments(open ? preSelectedCompanyId : undefined);

  // Use offline-aware hook for criteria (only when location is selected)
  const {
    data: criteriaData = [],
    isLoading: isLoadingCriteria,
    isFromCache: criteriaFromCache,
    error: criteriaError,
  } = useOfflineEnvironmentCriteria(selectedLocation || undefined);

  // Log errors for debugging
  useEffect(() => {
    if (envsError) {
      console.error('[NewAuditDialog] Error loading environments:', envsError);
    }
    if (criteriaError) {
      console.error('[NewAuditDialog] Error loading criteria:', criteriaError);
    }
  }, [envsError, criteriaError]);

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
  const rootEnv = useMemo(() => {
    if (!environments || environments.length === 0) return null;
    return environments.find(e => e.parent_id === null) || null;
  }, [environments]);
  
  const areas = useMemo(() => {
    if (!rootEnv || !environments) return [];
    return environments.filter(e => e.parent_id === rootEnv.id);
  }, [environments, rootEnv]);
  
  const envs = useMemo(() => {
    if (!selectedArea || !environments) return [];
    return environments.filter(e => e.parent_id === selectedArea);
  }, [environments, selectedArea]);
  
  const locations = useMemo(() => {
    if (!selectedEnvironment || !environments) return [];
    return environments.filter(e => e.parent_id === selectedEnvironment);
  }, [environments, selectedEnvironment]);

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
            total_questions: criteriaData?.length ?? 0,
            total_yes: 0,
            total_no: 0,
            score: null,
            _locationName: selectedLocationName,
            _companyName: preSelectedCompanyName,
          },
          (criteriaData ?? []).map(c => ({
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

        if (!criteriaData || (criteriaData?.length ?? 0) === 0) {
          throw new Error('Nenhum critério vinculado a este local.');
        }

        const auditItems = (criteriaData ?? []).map(criterion => ({
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

  const handleReset = () => {
    setSelectedArea("");
    setSelectedEnvironment("");
    setSelectedLocation("");
    setSelectedLocationName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] w-[95vw] sm:max-w-[500px] p-4 sm:p-6 flex flex-col overflow-hidden" 
        aria-describedby="new-audit-description"
      >
        {/* Header always visible - outside error boundary */}
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

        <DialogErrorBoundary onReset={handleReset}>
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-2 sm:py-4 pr-1">
          {/* Loading state */}
          {isLoadingEnvs && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Carregando ambientes...</p>
            </div>
          )}

          {/* Error state */}
          {!isLoadingEnvs && envsError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Erro ao carregar ambientes</span>
              </div>
              <p className="text-xs text-destructive/80 mt-1">
                {envsError.message || 'Tente fechar e abrir novamente.'}
              </p>
            </div>
          )}

          {/* Content - only show when not loading */}
          {!isLoadingEnvs && (
            <>
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
              ) : (criteriaData?.length ?? 0) > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                    Esta auditoria terá {criteriaData?.length ?? 0} {(criteriaData?.length ?? 0) === 1 ? 'pergunta' : 'perguntas'}
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
            </>
          )}
        </div>
        </DialogErrorBoundary>

        {/* Footer fixo - outside error boundary so cancel always works */}
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
            disabled={!selectedLocation || isCreating || (criteriaData?.length ?? 0) === 0}
            className="h-9 sm:h-10 text-sm"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {(criteriaData?.length ?? 0) === 0 ? 'Sem critérios' : isOffline ? 'Iniciar Offline' : 'Iniciar Auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
