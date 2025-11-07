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

type Step = 'select' | 'checklist' | 'result';

export default function NovaAuditoria() {
  const { companyInfo, user } = useAuth();
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
      // Create audit record
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

      // Fetch criteria for this company
      const { data: criteria, error: criteriaError } = await supabase
        .from('company_criteria')
        .select('id, name, description')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (criteriaError) throw criteriaError;

      // Create audit items for each criterion
      const auditItems = criteria.map(criterion => ({
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
        description: "Tente novamente mais tarde.",
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
