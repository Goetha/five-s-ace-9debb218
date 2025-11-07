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
  
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [locations, setLocations] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [criteriaCount, setCriteriaCount] = useState<number>(0);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && preSelectedCompanyId) {
      fetchEnvironments();
    }
  }, [open, preSelectedCompanyId]);

  const fetchEnvironments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', preSelectedCompanyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Encontrar o root e filtrar
      const root = data?.find(env => env.parent_id === null);
      const nonRootEnvs = data?.filter(env => env.parent_id !== null && env.parent_id === root?.id) || [];
      
      setEnvironments(nonRootEnvs);
    } catch (error) {
      console.error('Error fetching environments:', error);
      toast({
        title: "Erro ao carregar ambientes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
    
    try {
      // Buscar critérios vinculados ao local específico
      const { data: criteriaLinks, error: criteriaError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', value);

      if (criteriaError) throw criteriaError;

      let count = 0;

      // Se o local tem critérios específicos, contar esses
      if (criteriaLinks && criteriaLinks.length > 0) {
        const { count: specificCount, error: fetchError } = await supabase
          .from('company_criteria')
          .select('*', { count: 'exact', head: true })
          .in('id', criteriaLinks.map(link => link.criterion_id))
          .eq('status', 'active');

        if (fetchError) throw fetchError;
        count = specificCount || 0;
      } else {
        // Senão, contar TODOS os critérios ativos da empresa
        const { count: companyCount, error: fetchError } = await supabase
          .from('company_criteria')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', preSelectedCompanyId)
          .eq('status', 'active');

        if (fetchError) throw fetchError;
        count = companyCount || 0;
      }

      setCriteriaCount(count);
    } catch (error) {
      console.error('Error counting criteria:', error);
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

      let criteria;

      // Se o local tem critérios específicos, usar esses
      if (criteriaLinks && criteriaLinks.length > 0) {
        const { data: specificCriteria, error: fetchError } = await supabase
          .from('company_criteria')
          .select('id, name')
          .in('id', criteriaLinks.map(link => link.criterion_id))
          .eq('status', 'active');

        if (fetchError) throw fetchError;
        criteria = specificCriteria;
      } else {
        // Senão, buscar TODOS os critérios ativos da empresa
        const { data: companyCriteria, error: fetchError } = await supabase
          .from('company_criteria')
          .select('id, name')
          .eq('company_id', preSelectedCompanyId)
          .eq('status', 'active');

        if (fetchError) throw fetchError;
        criteria = companyCriteria;
      }

      // Validar se há critérios disponíveis
      if (!criteria || criteria.length === 0) {
        throw new Error('Nenhum critério ativo disponível para esta empresa. Entre em contato com o administrador.');
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
      <DialogContent className="sm:max-w-[500px]" aria-describedby="new-audit-description">
        <DialogHeader>
          <DialogTitle>Nova Auditoria</DialogTitle>
          <DialogDescription id="new-audit-description">
            Selecione o ambiente e local para iniciar a auditoria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Empresa (pré-selecionada) */}
          <div className="space-y-2">
            <Label>Empresa</Label>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
              <p className="font-medium text-primary">{preSelectedCompanyName}</p>
            </div>
          </div>

          {/* Ambiente */}
          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente *</Label>
            <Select
              value={selectedEnvironment}
              onValueChange={handleEnvironmentChange}
              disabled={isLoading}
            >
              <SelectTrigger id="environment">
                <SelectValue placeholder="Selecione o ambiente" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Local */}
          <div className="space-y-2">
            <Label htmlFor="location">Local *</Label>
            <Select
              value={selectedLocation}
              onValueChange={handleLocationChange}
              disabled={!selectedEnvironment || locations.length === 0}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder={
                  !selectedEnvironment 
                    ? "Selecione um ambiente primeiro" 
                    : locations.length === 0 
                    ? "Nenhum local disponível" 
                    : "Selecione o local"
                } />
              </SelectTrigger>
              <SelectContent>
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
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              {isLoadingCriteria ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando critérios...
                </div>
              ) : criteriaCount > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-blue-900">
                      Esta auditoria terá {criteriaCount} {criteriaCount === 1 ? 'critério' : 'critérios'} de avaliação
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Ambiente: {environments.find(e => e.id === selectedEnvironment)?.name}</p>
                    <p>• Local: {locations.find(l => l.id === selectedLocation)?.name}</p>
                    <p>• Perguntas: {criteriaCount}</p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Nenhum critério disponível</span>
                  </div>
                  <p className="text-sm text-amber-600">
                    Não há critérios ativos para este local. Entre em contato com o administrador para configurar critérios.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStartAudit}
            disabled={!selectedLocation || isCreating || criteriaCount === 0}
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {criteriaCount === 0 ? 'Sem critérios disponíveis' : 'Iniciar Auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
