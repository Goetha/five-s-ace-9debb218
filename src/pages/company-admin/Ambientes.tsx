import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, MapPin, Plus, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EnvironmentCard } from "@/components/company-admin/environments/EnvironmentCard";
import { CompanyCard } from "@/components/company-admin/environments/CompanyCard";
import { NewEnvironmentModal } from "@/components/company-admin/environments/NewEnvironmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Environment } from "@/types/environment";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function Ambientes() {
  const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  
  const { user, linkedCompanies, activeCompanyId } = useAuth();
  const activeCompany = linkedCompanies.find(c => c.id === activeCompanyId);
  const { toast } = useToast();

  useEffect(() => {
    if (user && activeCompany) {
      fetchEnvironments();
    }
  }, [user, activeCompany]);

  const fetchEnvironments = async () => {
    try {
      const companyId = activeCompany?.id;
      if (!companyId) return;

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
    } catch (error) {
      console.error('Error fetching environments:', error);
      toast({
        title: 'Erro ao carregar ambientes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Organize hierarchy: Root (Empresa) -> Ambientes -> Setores
  const company = allEnvironments.find(env => !env.parent_id);
  
  // Level 1: Ambientes (direct children of root)
  const environmentsList = allEnvironments.filter(env => env.parent_id === company?.id);
  
  // Level 2: Setores (children of ambientes)
  const sectorsList = allEnvironments.filter(env => {
    const parent = allEnvironments.find(e => e.id === env.parent_id);
    return parent && parent.parent_id === company?.id;
  });

  // Apply filters
  const filteredEnvironments = environmentsList.filter((env) => {
    const matchesSearch = env.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || env.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEnvironments = environmentsList.length;
  const totalSectors = sectorsList.length;
  const activeEnvironments = environmentsList.filter(e => e.status === 'active').length;
  const activeSectors = sectorsList.filter(s => s.status === 'active').length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Ambientes" }]}>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <div className="hidden sm:block mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/company-admin/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Ambientes e Setores</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Ambientes e Setores</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie a estrutura hierárquica da sua empresa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ambientes</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalEnvironments}</p>
                </div>
                <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Setores</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalSectors}</p>
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
                  <p className="text-xl sm:text-2xl font-bold">{activeEnvironments + activeSectors}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Input
            placeholder="Buscar ambientes..."
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

        {/* Company Card with Environments */}
        {company && (
          <CompanyCard
            company={company}
            totalEnvironments={totalEnvironments}
            totalLocations={totalSectors}
            onAddEnvironment={() => {
              setEditingEnvironment(null);
              setParentIdForNew(company.id);
              setShowNewModal(true);
            }}
            isExpanded={true}
            onToggleExpand={() => {}}
          />
        )}

        {/* Environments List */}
        <div className="space-y-4 mt-6">
          {filteredEnvironments.map((environment) => {
            return (
              <EnvironmentCard
                key={environment.id}
                environment={environment}
                locations={allEnvironments}
                onEdit={(env) => {
                  setEditingEnvironment(env);
                  setParentIdForNew(null);
                  setShowNewModal(true);
                }}
                onAddLocation={(envId) => {
                  setEditingEnvironment(null);
                  setParentIdForNew(envId);
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
