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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Environment {
  id: string;
  name: string;
  parent_id: string | null;
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
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [areas, setAreas] = useState<Environment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [locations, setLocations] = useState<Environment[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [criteriaCount, setCriteriaCount] = useState<number>(0);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && preSelectedCompanyId) {
      fetchAreas();
    }
  }, [open, preSelectedCompanyId]);

  const fetchAreas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', preSelectedCompanyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Encontrar o root e buscar as Áreas (filhas do root)
      const root = data?.find(env => env.parent_id === null);
      const areasList = data?.filter(env => env.parent_id !== null && env.parent_id === root?.id) || [];
      
      setAreas(areasList);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast({
        title: "Erro ao carregar áreas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnvironments = async (areaId: string) => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('parent_id', areaId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setEnvironments(data || []);
    } catch (error) {
      console.error('Error fetching environments:', error);
      toast({
        title: "Erro ao carregar ambientes",
        variant: "destructive"
      });
    }
  };

  const fetchLocations = async (environmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('parent_id', environmentId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Erro ao carregar locais",
        variant: "destructive"
      });
    }
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedEnvironment("");
    setSelectedLocation("");
    setEnvironments([]);
    setLocations([]);
    setCriteriaCount(0);
    fetchEnvironments(value);
  };

  const handleEnvironmentChange = (value: string) => {
    setSelectedEnvironment(value);
    setSelectedLocation("");
    setLocations([]);
    setCriteriaCount(0);
    fetchLocations(value);
  };

  const handleLocationChange = async (value: string) => {
    setSelectedLocation(value);
    setIsLoadingCriteria(true);
    
    console.log('🔍 handleLocationChange - Iniciando busca de critérios');
    console.log('📍 Location ID:', value);
    console.log('🏢 Company ID:', preSelectedCompanyId);
    console.log('📝 Company ID type:', typeof preSelectedCompanyId);
    
    try {
      // Buscar critérios vinculados ao local específico
      const { data: criteriaLinks, error: criteriaError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', value);

      console.log('🔗 Critérios vinculados ao local:', criteriaLinks);
      if (criteriaError) {
        console.error('❌ Erro ao buscar critérios vinculados:', criteriaError);
        throw criteriaError;
      }

      // Contar apenas critérios vinculados ao local
      if (!criteriaLinks || criteriaLinks.length === 0) {
        setCriteriaCount(0);
        return;
      }

      const { count: specificCount, error: fetchError } = await supabase
        .from('company_criteria')
        .select('*', { count: 'exact', head: true })
        .in('id', criteriaLinks.map(link => link.criterion_id))
        .eq('status', 'active');

      if (fetchError) throw fetchError;
      setCriteriaCount(specificCount || 0);
    } catch (error) {
      console.error('❌ Error counting criteria:', error);
      toast({
        title: "Erro ao carregar critérios",
        description: "Não foi possível carregar os critérios. Tente novamente.",
        variant: "destructive"
      });
      setCriteriaCount(0);
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  const handleStartAudit = async () => {
    if (!selectedLocation || !user) return;

    setIsCreating(true);
    try {
      // Criar auditoria
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

      // Validar que há critérios vinculados ao local
      if (!criteriaLinks || criteriaLinks.length === 0) {
        throw new Error('Nenhum critério vinculado a este local. Por favor, vincule critérios através do gerenciamento de locais.');
      }

      // Buscar detalhes dos critérios vinculados
      const { data: criteria, error: fetchError } = await supabase
        .from('company_criteria')
        .select('id, name')
        .in('id', criteriaLinks.map(link => link.criterion_id))
        .eq('status', 'active');

      if (fetchError) throw fetchError;

      // Validar se há critérios ativos
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

      // Fechar modal e navegar
      onOpenChange(false);
      navigate(`/auditor/auditoria/${audit.id}`);
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
          <DialogTitle className="text-lg sm:text-xl">Nova Auditoria</DialogTitle>
          <DialogDescription id="new-audit-description" className="text-sm">
            Selecione o ambiente e local para iniciar a auditoria
          </DialogDescription>
        </DialogHeader>

        {/* Área de conteúdo com scroll */}
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
            <Select
              value={selectedArea}
              onValueChange={handleAreaChange}
              disabled={isLoading}
            >
              <SelectTrigger id="area" className="h-9 sm:h-10">
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
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
              disabled={!selectedArea || environments.length === 0}
            >
              <SelectTrigger id="environment" className="h-9 sm:h-10">
                <SelectValue placeholder={
                  !selectedArea 
                    ? "Selecione uma área primeiro" 
                    : environments.length === 0 
                    ? "Nenhum ambiente disponível" 
                    : "Selecione o ambiente"
                } />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
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
              <SelectTrigger id="location" className="h-9 sm:h-10">
                <SelectValue placeholder={
                  !selectedEnvironment 
                    ? "Selecione um ambiente primeiro" 
                    : locations.length === 0 
                    ? "Nenhum local disponível" 
                    : "Selecione o local"
                } />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview de Critérios */}
          {selectedLocation && (
            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              {isLoadingCriteria ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando critérios...
                </div>
              ) : criteriaCount > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="font-medium text-blue-900 text-sm sm:text-base">
                    Esta auditoria terá {criteriaCount} {criteriaCount === 1 ? 'pergunta' : 'perguntas'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">Nenhum critério disponível</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-600">
                    Não há critérios ativos configurados para este local.
                  </p>
                  <div className="flex gap-2">
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
                </div>
              )}
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
            {criteriaCount === 0 ? 'Sem critérios' : 'Iniciar Auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
