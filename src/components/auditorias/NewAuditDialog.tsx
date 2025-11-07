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
import { Loader2 } from "lucide-react";

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
    fetchLocations(value);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Auditoria</DialogTitle>
          <DialogDescription>
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
              onValueChange={setSelectedLocation}
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
            disabled={!selectedLocation || isCreating}
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Auditoria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
