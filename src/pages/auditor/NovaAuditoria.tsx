import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { LocationSelector } from "@/components/auditoria/LocationSelector";
import { AuditChecklist } from "@/components/auditoria/AuditChecklist";
import { AuditResult } from "@/components/auditoria/AuditResult";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  createOfflineAudit,
  getCachedEnvironmentCriteriaByEnvId,
  getCachedCriteria,
  getCachedEnvironments,
  getCachedCompanies,
} from "@/lib/offlineStorage";

type Step = 'select' | 'checklist' | 'result';

export default function NovaAuditoria() {
  const { companyInfo, user, isOffline } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleLocationSelected = async (locationId: string, companyId: string) => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      // OFFLINE MODE: Create audit from cache
      if (isOffline || !navigator.onLine) {
        console.log('📴 Creating audit offline...');
        
        // Fetch criteria from cache
        const envCriteria = await getCachedEnvironmentCriteriaByEnvId(locationId);
        const allCriteria = await getCachedCriteria();
        
        // Filter active criteria linked to this location
        const activeCriteria = allCriteria.filter(c => 
          envCriteria.some(ec => ec.criterion_id === c.id) && c.status === 'active'
        );

        if (activeCriteria.length === 0) {
          throw new Error('Nenhum critério ativo vinculado a este local (cache)');
        }

        // Get location and company names from cache for display
        const cachedEnvs = await getCachedEnvironments();
        const cachedCompanies = await getCachedCompanies();
        const location = cachedEnvs.find(e => e.id === locationId);
        const company = cachedCompanies.find(c => c.id === companyId);

        // Create offline audit
        const { audit } = await createOfflineAudit(
          {
            company_id: companyId,
            location_id: locationId,
            auditor_id: user.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            total_questions: activeCriteria.length,
            total_yes: 0,
            total_no: 0,
            score: null,
            _locationName: location?.name || 'Local',
            _companyName: company?.name || 'Empresa',
          },
          activeCriteria.map(criterion => ({
            criterion_id: criterion.id,
            question: criterion.description || criterion.name,
            senso: criterion.senso,
          }))
        );

        setSelectedLocation(locationId);
        setAuditId(audit.id);
        setStep('checklist');

        toast({
          title: "Auditoria iniciada (Offline)",
          description: "Os dados serão sincronizados quando você voltar online."
        });
        return;
      }

      // ONLINE MODE: Create audit via Supabase
      const { data: audit, error } = await supabase
        .from('audits')
        .insert({
          company_id: companyId,
          location_id: locationId,
          auditor_id: user.id,
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch criteria linked to this specific location
      const { data: environmentCriteria, error: criteriaError } = await supabase
        .from('environment_criteria')
        .select(`
          criterion_id,
          company_criteria!inner(id, name, description, status, senso)
        `)
        .eq('environment_id', locationId);

      if (criteriaError) throw criteriaError;

      // Filter only active criteria and map to audit items
      const activeCriteria = environmentCriteria
        .filter(ec => ec.company_criteria.status === 'active')
        .map(ec => ec.company_criteria);

      if (activeCriteria.length === 0) {
        throw new Error('Nenhum critério ativo vinculado a este local');
      }

      // Create audit items for each criterion
      const auditItems = activeCriteria.map(criterion => ({
        audit_id: audit.id,
        criterion_id: criterion.id,
        question: criterion.description || criterion.name
      }));

      const { error: itemsError } = await supabase
        .from('audit_items')
        .insert(auditItems);

      if (itemsError) throw itemsError;

      setSelectedLocation(locationId);
      setAuditId(audit.id);
      setStep('checklist');

      toast({
        title: "Auditoria iniciada",
        description: "Você pode começar a avaliar os critérios."
      });
    } catch (error) {
      console.error('Error creating audit:', error);
      toast({
        title: "Erro ao iniciar auditoria",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAuditCompleted = () => {
    setStep('result');
  };

  const handleNewAudit = () => {
    setStep('select');
    setSelectedLocation(null);
    setAuditId(null);
  };

  const handleViewDetails = () => {
    if (auditId) {
      navigate(`/auditor/auditoria/${auditId}`);
    }
  };

  if (isCreating) {
    return (
      <CompanyAdminLayout breadcrumbs={[{ label: "Nova Auditoria" }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Iniciando auditoria...</p>
          </div>
        </div>
      </CompanyAdminLayout>
    );
  }

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Nova Auditoria" }]}>
      <div className="p-6 max-w-4xl mx-auto">
        {step === 'select' && (
          <LocationSelector onLocationSelected={handleLocationSelected} />
        )}

        {step === 'checklist' && auditId && (
          <AuditChecklist 
            auditId={auditId} 
            onCompleted={handleAuditCompleted}
          />
        )}

        {step === 'result' && auditId && (
          <AuditResult 
            auditId={auditId}
            onNewAudit={handleNewAudit}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>
    </CompanyAdminLayout>
  );
}
