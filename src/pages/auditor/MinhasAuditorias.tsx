import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search } from "lucide-react";
import type { Audit } from "@/types/audit";
import type { AuditCycleWithDetails } from "@/types/auditCycle";
import { CycleProgressCard } from "@/components/auditorias/CycleProgressCard";
import { CycleAuditDialog } from "@/components/auditorias/CycleAuditDialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface CompanyWithCycle {
  id: string;
  name: string;
  activeCycle: AuditCycleWithDetails | null;
}

export default function MinhasAuditorias() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyWithCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch user's linked companies
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id);

      if (ucError) throw ucError;

      const companyIds = userCompanies?.map(uc => uc.company_id) || [];
      
      if (companyIds.length === 0) {
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      // Fetch company details
      const { data: companiesData, error: compError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)
        .eq('status', 'active')
        .order('name');

      if (compError) throw compError;

      // Fetch active cycles for user's companies
      const { data: cyclesData } = await supabase
        .from('audit_cycles')
        .select('*')
        .in('company_id', companyIds)
        .eq('auditor_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      // Map companies with their active cycles
      const companiesWithCycles: CompanyWithCycle[] = (companiesData || []).map(company => {
        const activeCycle = cyclesData?.find(c => c.company_id === company.id);
        return {
          id: company.id,
          name: company.name,
          activeCycle: activeCycle ? {
            ...activeCycle,
            company_name: company.name,
            auditor_name: '',
            audited_location_ids: []
          } as AuditCycleWithDetails : null
        };
      });

      setCompanies(companiesWithCycles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartCycle = (companyId: string, companyName: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
    setSelectedCycleId(null);
    setDialogOpen(true);
  };

  const handleContinueCycle = (companyId: string, companyName: string, cycleId: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
    setSelectedCycleId(cycleId);
    setDialogOpen(true);
  };

  const handleCycleUpdated = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <CompanyAdminLayout breadcrumbs={[{ label: "Auditorias" }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyAdminLayout>
    );
  }

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Auditorias" }]}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Ciclos de Auditoria</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete todos os locais de uma empresa antes de iniciar um novo ciclo
          </p>
        </div>

        {/* Busca */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Cards de Ciclos */}
        {filteredCompanies.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Plus className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {searchTerm 
                ? "Tente ajustar os filtros de busca" 
                : "Você não está vinculado a nenhuma empresa"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCompanies.map((company) => (
              <CycleProgressCard
                key={company.id}
                companyId={company.id}
                companyName={company.name}
                activeCycle={company.activeCycle}
                onStartCycle={handleStartCycle}
                onContinueCycle={handleContinueCycle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Ciclo */}
      {selectedCompany && (
        <CycleAuditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          cycleId={selectedCycleId}
          onCycleUpdated={handleCycleUpdated}
        />
      )}
    </CompanyAdminLayout>
  );
}
