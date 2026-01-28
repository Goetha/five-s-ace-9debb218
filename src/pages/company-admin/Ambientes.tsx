import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, MapPin, Plus, CheckCircle, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EnvironmentCard } from "@/components/company-admin/environments/EnvironmentCard";
import { CompanyCard } from "@/components/company-admin/environments/CompanyCard";
import { NewEnvironmentModal } from "@/components/company-admin/environments/NewEnvironmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Environment } from "@/types/environment";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { getCachedEnvironmentsByCompanyId } from "@/lib/offlineStorage";

export default function Ambientes() {
  const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  
  const { user, linkedCompanies, activeCompanyId, isOffline } = useAuth();
  const activeCompany = linkedCompanies.find(c => c.id === activeCompanyId);
  const { toast } = useToast();

  useEffect(() => {
    if (user && activeCompany) {
      fetchEnvironments();
    }
  }, [user, activeCompany]);

  const fetchEnvironments = async () => {
    setIsLoading(true);
    setIsFromCache(false);
    
    try {
      const companyId = activeCompany?.id;
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // OFFLINE MODE: Fetch from cache
      if (isOffline || !navigator.onLine) {
        console.log('📴 Loading environments from cache...');
        const cachedEnvs = await getCachedEnvironmentsByCompanyId(companyId);
        
        const mappedEnvironments: Environment[] = cachedEnvs.map((env) => ({
          id: env.id,
          company_id: env.company_id,
          name: env.name,
          icon: 'building',
          parent_id: env.parent_id,
          status: env.status as 'active' | 'inactive',
          audits_count: 0,
          description: env.description || undefined,
          created_at: env.created_at,
        }));
        
        setAllEnvironments(mappedEnvironments);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }

      // ONLINE MODE: Fetch from Supabase
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedEnvironments: Environment[] = (data || []).map((env) => ({
        id: env.id,
        company_id: env.company_id,
        name: env.name,
        icon: 'building',
        parent_id: env.parent_id,
        status: env.status as 'active' | 'inactive',
        audits_count: 0,
        description: env.description || undefined,
        created_at: env.created_at,
      }));

      setAllEnvironments(mappedEnvironments);
      setLastSyncAt(new Date().toISOString());
    } catch (error: any) {
      console.error('Error fetching environments:', error);
      
      // Fallback to cache on error
      try {
        const companyId = activeCompany?.id;
        if (companyId) {
          console.log('📴 Falling back to cache after error...');
          const cachedEnvs = await getCachedEnvironmentsByCompanyId(companyId);
          const mappedEnvironments: Environment[] = cachedEnvs.map((env) => ({
            id: env.id,
            company_id: env.company_id,
            name: env.name,
            icon: 'building',
            parent_id: env.parent_id,
            status: env.status as 'active' | 'inactive',
            audits_count: 0,
            description: env.description || undefined,
            created_at: env.created_at,
          }));
          setAllEnvironments(mappedEnvironments);
          setIsFromCache(true);
        }
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
        toast({
          title: 'Erro ao carregar ambientes',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Organize hierarchy: Root (Empresa) -> Setores -> Locais
  const company = allEnvironments.find(env => !env.parent_id);
  
  // Level 1: Setores (direct children of root)
  const sectorsList = allEnvironments.filter(env => env.parent_id === company?.id);
  
  // Level 2: Locais (children of setores)
  const locationsList = allEnvironments.filter(env => {
    const parent = allEnvironments.find(e => e.id === env.parent_id);
    return parent && parent.parent_id === company?.id;
  });

  // Apply filters
  const filteredSectors = sectorsList.filter((env) => {
    const matchesSearch = env.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || env.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSectors = sectorsList.length;
  const totalLocations = locationsList.length;
  const activeSectors = sectorsList.filter(e => e.status === 'active').length;
  const activeLocations = locationsList.filter(l => l.status === 'active').length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Setores" }]}>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Offline Banner */}
        <OfflineBanner
          isOffline={isOffline || !navigator.onLine}
          isFromCache={isFromCache}
          lastSyncAt={lastSyncAt}
          onRefresh={fetchEnvironments}
          isRefreshing={isLoading}
        />

        <div className="hidden sm:block mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/company-admin/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Setores e Locais</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Setores e Locais</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie a estrutura hierárquica da sua empresa
            </p>
          </div>
          {isFromCache && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Setores</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalSectors}</p>
                </div>
                <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Locais</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalLocations}</p>
                </div>
                <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold">{activeSectors + activeLocations}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Input
            placeholder="Buscar setores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 h-9 sm:h-10"
          />
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Card with Sectors */}
        {company && (
          <CompanyCard
            company={company}
            totalEnvironments={totalSectors}
            totalLocations={totalLocations}
            onAddEnvironment={() => {
              setEditingEnvironment(null);
              setParentIdForNew(company.id);
              setShowNewModal(true);
            }}
            isExpanded={true}
            onToggleExpand={() => {}}
          />
        )}

        {/* Sectors List */}
        <div className="space-y-4 mt-6">
          {filteredSectors.map((sector) => {
            return (
              <EnvironmentCard
                key={sector.id}
                environment={sector}
                locations={allEnvironments}
                onEdit={(env) => {
                  setEditingEnvironment(env);
                  setParentIdForNew(null);
                  setShowNewModal(true);
                }}
                onAddLocation={(sectorId) => {
                  setEditingEnvironment(null);
                  setParentIdForNew(sectorId);
                  setShowNewModal(true);
                }}
                onRefresh={fetchEnvironments}
              />
            );
          })}
        </div>

        {/* New/Edit Modal */}
        <NewEnvironmentModal
          open={showNewModal}
          onOpenChange={(open) => {
            setShowNewModal(open);
            if (!open) {
              setEditingEnvironment(null);
              setParentIdForNew(null);
            }
          }}
          onSuccess={fetchEnvironments}
          editingEnvironment={editingEnvironment}
          parentId={parentIdForNew}
          companyId={activeCompany?.id}
        />
      </div>
    </CompanyAdminLayout>
  );
}
