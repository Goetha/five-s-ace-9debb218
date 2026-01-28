import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, WifiOff } from "lucide-react";
import type { Audit } from "@/types/audit";
import { AuditorCompanyCard } from "@/components/auditorias/AuditorCompanyCard";
import { NewAuditDialog } from "@/components/auditorias/NewAuditDialog";
import { Input } from "@/components/ui/input";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import {
  getCachedAudits,
  getCachedCompanies,
  getCachedEnvironments,
} from "@/lib/offlineStorage";

interface AuditWithLocation extends Audit {
  location_name: string;
  company_name: string;
}

interface CompanyGroup {
  company_id: string;
  company_name: string;
  audits: AuditWithLocation[];
}

export default function MinhasAuditorias() {
  const { user, isOffline } = useAuth();
  const { toast } = useToast();
  const [audits, setAudits] = useState<AuditWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchAudits();
  }, [user]);

  const fetchAudits = async () => {
    if (!user) return;

    setIsLoading(true);
    setIsFromCache(false);

    try {
      // OFFLINE MODE: Fetch from cache
      if (isOffline || !navigator.onLine) {
        console.log('📴 Loading audits from cache...');
        
        const cachedAudits = await getCachedAudits();
        const cachedCompanies = await getCachedCompanies();
        const cachedEnvs = await getCachedEnvironments();
        
        // Filter audits by current user
        const userAudits = cachedAudits.filter(a => a.auditor_id === user.id);
        
        // Map with location and company names
        const auditsWithLocation: AuditWithLocation[] = userAudits.map((audit: any) => {
          const env = cachedEnvs.find(e => e.id === audit.location_id);
          const company = cachedCompanies.find(c => c.id === audit.company_id);
          return {
            ...audit,
            status: audit.status as 'in_progress' | 'completed',
            score_level: audit.score_level as 'low' | 'medium' | 'high' | null,
            location_name: audit._locationName || env?.name || 'Local',
            company_name: audit._companyName || company?.name || 'Empresa'
          };
        });

        // Sort by created_at descending
        auditsWithLocation.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setAudits(auditsWithLocation);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      // ONLINE MODE: Fetch from Supabase
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          environments!audits_location_id_fkey(name),
          companies!audits_company_id_fkey(name)
        `)
        .eq('auditor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type cast to ensure TypeScript compatibility
      const auditsWithLocation = data.map((audit: any) => ({
        ...audit,
        status: audit.status as 'in_progress' | 'completed',
        score_level: audit.score_level as 'low' | 'medium' | 'high' | null,
        location_name: audit.environments.name,
        company_name: audit.companies.name
      }));

      setAudits(auditsWithLocation);
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching audits:', error);
      
      // Fallback to cache on error
      try {
        console.log('📴 Falling back to cache after error...');
        const cachedAudits = await getCachedAudits();
        const cachedCompanies = await getCachedCompanies();
        const cachedEnvs = await getCachedEnvironments();
        
        const userAudits = cachedAudits.filter(a => a.auditor_id === user.id);
        const auditsWithLocation: AuditWithLocation[] = userAudits.map((audit: any) => {
          const env = cachedEnvs.find(e => e.id === audit.location_id);
          const company = cachedCompanies.find(c => c.id === audit.company_id);
          return {
            ...audit,
            status: audit.status as 'in_progress' | 'completed',
            score_level: audit.score_level as 'low' | 'medium' | 'high' | null,
            location_name: audit._locationName || env?.name || 'Local',
            company_name: audit._companyName || company?.name || 'Empresa'
          };
        });
        
        auditsWithLocation.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setAudits(auditsWithLocation);
        setIsFromCache(true);
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
        toast({
          title: "Erro ao carregar auditorias",
          description: "Tente novamente mais tarde.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAudits = audits.filter(audit => {
    const matchesFilter = filter === 'all' || audit.status === filter;
    const matchesSearch = audit.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Agrupar auditorias por empresa
  const companiesMap = new Map<string, CompanyGroup>();
  filteredAudits.forEach(audit => {
    if (!companiesMap.has(audit.company_id)) {
      companiesMap.set(audit.company_id, {
        company_id: audit.company_id,
        company_name: audit.company_name,
        audits: []
      });
    }
    companiesMap.get(audit.company_id)!.audits.push(audit);
  });

  const companyGroups = Array.from(companiesMap.values());

  const handleStartNewAudit = (companyId: string, companyName: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
    setDialogOpen(true);
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
        {/* Offline Banner */}
        <OfflineBanner
          isOffline={isOffline || !navigator.onLine}
          isFromCache={isFromCache}
          lastSyncAt={lastSyncAt}
          onRefresh={fetchAudits}
          isRefreshing={isLoading}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Auditorias</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie suas avaliações 5S por empresa</p>
          </div>
          {isFromCache && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </div>
          )}
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
              className="whitespace-nowrap snap-start flex-shrink-0"
            >
              Todas ({audits.length})
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'default' : 'outline'}
              onClick={() => setFilter('in_progress')}
              size="sm"
              className="whitespace-nowrap snap-start flex-shrink-0"
            >
              Em Andamento ({audits.filter(a => a.status === 'in_progress').length})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              onClick={() => setFilter('completed')}
              size="sm"
              className="whitespace-nowrap snap-start flex-shrink-0"
            >
              Concluídas ({audits.filter(a => a.status === 'completed').length})
            </Button>
          </div>
          
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Cards de Empresas */}
        {companyGroups.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Plus className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhuma auditoria encontrada</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {searchTerm 
                ? "Tente ajustar os filtros de busca" 
                : "Comece criando sua primeira auditoria"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {companyGroups.map((company) => (
              <AuditorCompanyCard
                key={company.company_id}
                companyId={company.company_id}
                companyName={company.company_name}
                audits={company.audits}
                onStartNewAudit={handleStartNewAudit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Nova Auditoria */}
      {selectedCompany && (
        <NewAuditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          preSelectedCompanyId={selectedCompany.id}
          preSelectedCompanyName={selectedCompany.name}
        />
      )}
    </CompanyAdminLayout>
  );
}
