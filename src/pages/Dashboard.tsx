import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineData } from "@/hooks/useOfflineData";
import Header from "@/components/layout/Header";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { WhatsAppHeader } from "@/components/dashboard/WhatsAppHeader";
import { CompanySearchBar } from "@/components/dashboard/CompanySearchBar";
import { FilterChips, FilterType } from "@/components/dashboard/FilterChips";
import { ArchivedSection } from "@/components/dashboard/ArchivedSection";
import { CompanyListItem } from "@/components/dashboard/CompanyListItem";
import { NewCompanyModal } from "@/components/empresas/NewCompanyModal";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);

  // Fetch companies with offline support
  const { 
    data: companies, 
    isLoading: loadingCompanies, 
    isOffline,
    isFromCache,
    lastSyncAt,
    refetch: refetchCompanies 
  } = useOfflineData({
    cacheKey: 'companies',
    fetchOnline: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, status, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch audits for last audit info
  const { data: audits } = useOfflineData({
    cacheKey: 'audits_summary',
    fetchOnline: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select('id, company_id, score, completed_at, status')
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Build company data with audit info
  const companiesWithAuditInfo = useMemo(() => {
    return companies.map(company => {
      const companyAudits = audits.filter(a => a.company_id === company.id);
      const lastCompletedAudit = companyAudits.find(a => a.status === 'completed');
      const pendingAudits = companyAudits.filter(a => a.status === 'in_progress' || a.status === 'pending');
      
      return {
        ...company,
        lastAuditScore: lastCompletedAudit?.score ?? null,
        lastAuditDate: lastCompletedAudit?.completed_at ?? company.updated_at,
        pendingCount: pendingAudits.length,
        isCompleted: lastCompletedAudit?.status === 'completed',
      };
    });
  }, [companies, audits]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    let result = companiesWithAuditInfo.filter(c => c.status === 'active');
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(term));
    }
    
    // Status filter
    switch (activeFilter) {
      case 'pending':
        result = result.filter(c => c.pendingCount > 0);
        break;
      case 'favorites':
        // TODO: Implement favorites
        break;
      case 'with-pa':
        // TODO: Implement PA filter
        break;
    }
    
    return result;
  }, [companiesWithAuditInfo, searchTerm, activeFilter]);

  // Archived (inactive) companies
  const archivedCompanies = useMemo(() => {
    return companiesWithAuditInfo.filter(c => c.status === 'inactive');
  }, [companiesWithAuditInfo]);

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: companiesWithAuditInfo.filter(c => c.status === 'active').length,
    pending: companiesWithAuditInfo.filter(c => c.status === 'active' && c.pendingCount > 0).length,
    favorites: 0, // TODO
    withPa: 0, // TODO
  }), [companiesWithAuditInfo]);

  const handleCompanyClick = (companyId: string) => {
    navigate(`/auditorias?company=${companyId}`);
  };

  const handleArchivedClick = () => {
    navigate('/empresas?status=inactive');
  };

  const handleNewCompany = () => {
    setShowNewCompanyModal(true);
  };

  const handleCompanyCreated = () => {
    refetchCompanies();
    setShowNewCompanyModal(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <WhatsAppHeader onNewCompany={handleNewCompany} />

        {/* Offline Banner */}
        <OfflineBanner 
          isOffline={isOffline}
          isFromCache={isFromCache}
          lastSyncAt={lastSyncAt}
          onRefresh={refetchCompanies}
          isRefreshing={loadingCompanies}
        />

        <CompanySearchBar 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <FilterChips 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />

        {/* Company List */}
        <div className="flex-1 overflow-y-auto">
          {loadingCompanies ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <ArchivedSection 
                count={archivedCompanies.length}
                onClick={handleArchivedClick}
              />

              {filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                  </p>
                  <button
                    onClick={handleNewCompany}
                    className="text-primary font-medium hover:underline"
                  >
                    Adicionar empresa
                  </button>
                </div>
              ) : (
                filteredCompanies.map(company => (
                  <CompanyListItem
                    key={company.id}
                    id={company.id}
                    name={company.name}
                    lastAuditScore={company.lastAuditScore}
                    lastAuditDate={company.lastAuditDate}
                    pendingCount={company.pendingCount}
                    isCompleted={company.isCompleted}
                    status={company.status}
                    onClick={() => handleCompanyClick(company.id)}
                  />
                ))
              )}
            </>
          )}
        </div>
      </main>

      {/* New Company Modal */}
      <NewCompanyModal
        open={showNewCompanyModal}
        onOpenChange={setShowNewCompanyModal}
        onSave={async (data) => {
          const { data: company, error } = await supabase
            .from('companies')
            .insert({
              name: data.name,
              email: data.email,
              phone: data.phone,
              status: 'active',
            })
            .select('id')
            .single();
          
          if (error) throw error;
          refetchCompanies();
          return company.id;
        }}
      />
    </div>
  );
};

export default Dashboard;
