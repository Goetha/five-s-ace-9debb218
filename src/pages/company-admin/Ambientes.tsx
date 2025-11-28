import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Layers, MapPin, Plus, CheckCircle } from "lucide-react";
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

  // Organize hierarchy: Root -> Areas -> Environments -> Locals
  const company = allEnvironments.find(env => !env.parent_id);
  
  // Level 1: Areas (direct children of root)
  const areasList = allEnvironments.filter(env => env.parent_id === company?.id);
  
  // Level 2: Environments (children of areas)
  const environmentsList = allEnvironments.filter(env => {
    const parent = allEnvironments.find(e => e.id === env.parent_id);
    return parent && parent.parent_id === company?.id;
  });
  
  // Level 3: Locals (children of environments)
  const localsList = allEnvironments.filter(env => {
    const parent = allEnvironments.find(e => e.id === env.parent_id);
    if (!parent) return false;
    const grandparent = allEnvironments.find(e => e.id === parent.parent_id);
    return grandparent && grandparent.parent_id === company?.id;
  });

  // Apply filters
  const filteredAreas = areasList.filter((env) => {
    const matchesSearch = env.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || env.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAreas = areasList.length;
  const totalEnvironments = environmentsList.length;
  const totalLocals = localsList.length;
  const activeAreas = areasList.filter(e => e.status === 'active').length;
  const activeEnvironments = environmentsList.filter(e => e.status === 'active').length;
  const activeLocals = localsList.filter(l => l.status === 'active').length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Áreas" }]}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/company-admin/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Áreas, Ambientes e Locais</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Áreas, Ambientes e Locais</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie a estrutura hierárquica da sua empresa
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Áreas</p>
                  <p className="text-2xl font-bold">{totalAreas}</p>
                </div>
                <Building2 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Ambientes</p>
                  <p className="text-2xl font-bold">{totalEnvironments}</p>
                </div>
                <Layers className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Locais</p>
                  <p className="text-2xl font-bold">{totalLocals}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Ativos</p>
                  <p className="text-2xl font-bold">{activeAreas + activeEnvironments + activeLocals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Buscar áreas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Card with Areas */}
        {company && (
          <CompanyCard
            company={company}
            totalEnvironments={totalAreas}
            totalLocations={totalEnvironments + totalLocals}
            onAddEnvironment={() => {
              setEditingEnvironment(null);
              setParentIdForNew(company.id);
              setShowNewModal(true);
            }}
            isExpanded={true}
            onToggleExpand={() => {}}
          />
        )}

        {/* Areas List */}
        <div className="space-y-4 mt-6">
          {filteredAreas.map((area) => {
            // Get all descendants (environments and locals) for this area
            const areaChildren = allEnvironments.filter(env => env.parent_id === area.id);
            const areaGrandchildren = allEnvironments.filter(env => 
              areaChildren.some(child => child.id === env.parent_id)
            );
            const allDescendants = [...areaChildren, ...areaGrandchildren];
            
            return (
              <EnvironmentCard
                key={area.id}
                environment={area}
                locations={allDescendants}
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
