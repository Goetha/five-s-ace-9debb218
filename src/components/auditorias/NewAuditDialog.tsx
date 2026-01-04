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
        className="max-h-[85vh] w-[calc(100vw-32px)] sm:max-w-[460px] p-0 flex flex-col overflow-hidden rounded-2xl border-border/50" 
        aria-describedby="new-audit-description"
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 p-5 pb-4 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold">Nova Auditoria</DialogTitle>
              <DialogDescription id="new-audit-description" className="text-sm text-muted-foreground">
                Selecione onde iniciar a auditoria
              </DialogDescription>
            </div>
            <div className="flex gap-1.5">
              {isUsingCache && (
                <Badge variant="outline" className="gap-1 text-xs text-blue-500 border-blue-500/30 bg-blue-500/10">
                  <Database className="h-3 w-3" />
                  Cache
                </Badge>
              )}
              {isOffline && (
                <Badge variant="outline" className="gap-1 text-xs text-amber-500 border-amber-500/30 bg-amber-500/10">
                  <CloudOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogErrorBoundary onReset={handleReset}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Loading state */}
            {isLoadingEnvs && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Carregando ambientes...</p>
              </div>
            )}

            {/* Error state */}
            {!isLoadingEnvs && envsError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <div className="flex items-center gap-3 text-destructive">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Erro ao carregar ambientes</span>
                    <p className="text-xs text-destructive/70 mt-0.5">
                      {envsError.message || 'Tente fechar e abrir novamente.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {!isLoadingEnvs && !envsError && (
              <>
                {/* Empresa Card */}
                <div className="p-4 bg-card border border-border/50 rounded-xl">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
                  <p className="font-semibold text-foreground mt-1">{preSelectedCompanyName}</p>
                </div>

                {/* Selects em um card agrupado */}
                <div className="space-y-3 p-4 bg-card border border-border/50 rounded-xl">
                  {/* Área */}
                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Área <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedArea} onValueChange={handleAreaChange} disabled={isLoadingEnvs}>
                      <SelectTrigger className="w-full h-11 bg-background/50 hover:bg-background transition-colors">
                        <SelectValue placeholder={isLoadingEnvs ? "Carregando..." : areas.length === 0 ? "Nenhuma área disponível" : "Toque para selecionar"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {areas.map(area => (
                          <SelectItem key={area.id} value={area.id} className="py-3">{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ambiente */}
                  <div className="space-y-2">
                    <Label htmlFor="environment" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Ambiente <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={selectedEnvironment} 
                      onValueChange={handleEnvironmentChange} 
                      disabled={!selectedArea || envs.length === 0}
                    >
                      <SelectTrigger className={`w-full h-11 transition-colors ${!selectedArea ? 'opacity-50' : 'bg-background/50 hover:bg-background'}`}>
                        <SelectValue placeholder={
                          !selectedArea 
                            ? "Selecione uma área primeiro" 
                            : envs.length === 0 
                            ? "Nenhum ambiente disponível" 
                            : "Toque para selecionar"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {envs.map(env => (
                          <SelectItem key={env.id} value={env.id} className="py-3">{env.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Local */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Local <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={selectedLocation} 
                      onValueChange={handleLocationChange} 
                      disabled={!selectedEnvironment || locations.length === 0}
                    >
                      <SelectTrigger className={`w-full h-11 transition-colors ${!selectedEnvironment ? 'opacity-50' : 'bg-background/50 hover:bg-background'}`}>
                        <SelectValue placeholder={
                          !selectedEnvironment 
                            ? "Selecione um ambiente primeiro" 
                            : locations.length === 0 
                            ? "Nenhum local disponível" 
                            : "Toque para selecionar"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id} className="py-3">{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview de Critérios */}
                {selectedLocation && (
                  <div className={`p-4 rounded-xl border ${
                    isLoadingCriteria 
                      ? 'bg-muted/30 border-border/50' 
                      : (criteriaData?.length ?? 0) > 0 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {isLoadingCriteria ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Verificando critérios...</span>
                      </div>
                    ) : (criteriaData?.length ?? 0) > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {criteriaData?.length ?? 0} {(criteriaData?.length ?? 0) === 1 ? 'pergunta' : 'perguntas'}
                          </span>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                            Pronto para iniciar a auditoria
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            Sem critérios
                          </span>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                            Configure critérios para este local
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Offline info */}
                {isOffline && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <CloudOff className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Modo offline</span>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                          Sincroniza automaticamente ao reconectar
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogErrorBoundary>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-4 border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="flex-1 h-12 text-base font-medium"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStartAudit}
            disabled={!selectedLocation || isCreating || (criteriaData?.length ?? 0) === 0}
            className="flex-1 h-12 text-base font-medium"
          >
            {isCreating && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            {(criteriaData?.length ?? 0) === 0 ? 'Sem critérios' : isOffline ? 'Iniciar Offline' : 'Iniciar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
