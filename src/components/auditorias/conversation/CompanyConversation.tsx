import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CompanyConversationHeader } from "./CompanyConversationHeader";
import { AuditTimeline } from "./AuditTimeline";
import { ConversationInputBar } from "./ConversationInputBar";
import { NewAuditDialog } from "../NewAuditDialog";

interface CompanyConversationProps {
  companyId: string;
}

interface AuditData {
  id: string;
  location_id: string;
  location_name: string;
  environment_name: string;
  area_name: string;
  score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export function CompanyConversation({ companyId }: CompanyConversationProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOffline } = useAuth();
  
  const [companyName, setCompanyName] = useState("");
  const [audits, setAudits] = useState<AuditData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewAuditOpen, setIsNewAuditOpen] = useState(false);

  const fetchCompanyData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscar dados da empresa
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", companyId)
        .single();

      if (companyError) throw companyError;
      setCompanyName(company.name);

      // Buscar auditorias da empresa
      const { data: auditsData, error: auditsError } = await supabase
        .from("audits")
        .select("id, location_id, score, status, started_at, completed_at")
        .eq("company_id", companyId)
        .order("started_at", { ascending: false });

      if (auditsError) throw auditsError;

      // Buscar environments para hierarquia
      const { data: environments, error: envsError } = await supabase
        .from("environments")
        .select("id, name, parent_id, company_id")
        .eq("company_id", companyId);

      if (envsError) throw envsError;

      // Criar mapa de environments
      const envMap = new Map(environments?.map((e) => [e.id, e]) || []);

      // Função para obter hierarquia
      const getHierarchy = (locationId: string) => {
        const location = envMap.get(locationId);
        if (!location) return { local: "N/A", environment: "N/A", area: "N/A" };

        const environment = location.parent_id
          ? envMap.get(location.parent_id)
          : null;
        const area = environment?.parent_id
          ? envMap.get(environment.parent_id)
          : null;

        return {
          local: location.name,
          environment: environment?.name || "N/A",
          area: area?.name || "N/A",
        };
      };

      // Processar auditorias com hierarquia
      const processedAudits: AuditData[] =
        auditsData?.map((audit) => {
          const hierarchy = getHierarchy(audit.location_id);
          return {
            id: audit.id,
            location_id: audit.location_id,
            location_name: hierarchy.local,
            environment_name: hierarchy.environment,
            area_name: hierarchy.area,
            score: audit.score,
            status: audit.status,
            started_at: audit.started_at || "",
            completed_at: audit.completed_at,
          };
        }) || [];

      setAudits(processedAudits);
    } catch (error: any) {
      console.error("Error fetching company data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId, fetchCompanyData]);

  const handleBack = () => {
    navigate("/");
  };

  const handleAuditClick = (auditId: string) => {
    navigate(`/auditor/auditoria/${auditId}`);
  };

  const handleNewAudit = () => {
    setIsNewAuditOpen(true);
  };

  const handleViewDetails = () => {
    navigate(`/empresas?company=${companyId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <CompanyConversationHeader
        companyName={companyName || "Carregando..."}
        totalAudits={audits.length}
        onBack={handleBack}
        onNewAudit={handleNewAudit}
        onViewDetails={handleViewDetails}
      />

      <AuditTimeline
        audits={audits}
        onAuditClick={handleAuditClick}
        isLoading={isLoading}
      />

      <ConversationInputBar onNewAudit={handleNewAudit} />

      <NewAuditDialog
        open={isNewAuditOpen}
        onOpenChange={setIsNewAuditOpen}
        preSelectedCompanyId={companyId}
        preSelectedCompanyName={companyName}
      />
    </div>
  );
}
