import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EmpresasTabs } from "@/components/empresas/EmpresasTabs";
import { CompanyStatsCards } from "@/components/empresas/CompanyStatsCards";
import { CompanySearchBar } from "@/components/empresas/CompanySearchBar";
import { CompanyBulkActions } from "@/components/empresas/CompanyBulkActions";
import { CompanyCards } from "@/components/empresas/CompanyCards";
import { CompanyOverviewDashboard } from "@/components/empresas/overview/CompanyOverviewDashboard";
import { NewCompanyModal } from "@/components/empresas/NewCompanyModal";
import { ViewCompanyModal } from "@/components/empresas/ViewCompanyModal";
import { EditCompanyModal } from "@/components/empresas/EditCompanyModal";
import { AssignModelsModal } from "@/components/empresas/AssignModelsModal";
import { AssignAuditorsModal } from "@/components/empresas/AssignAuditorsModal";
import { DeleteCompanyDialog } from "@/components/empresas/DeleteCompanyDialog";
import { ToggleStatusDialog } from "@/components/empresas/ToggleStatusDialog";
import { SendEmailModal } from "@/components/empresas/SendEmailModal";
import { mockCompanies } from "@/data/mockCompanies";
import { mockModels } from "@/data/mockModels";
import { Company, CompanyFormData } from "@/types/company";
import { MasterModel } from "@/types/model";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Empresas() {
  const { toast } = useToast();
  
  // Load companies from backend on mount (fallback to localStorage if backend fails)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Load companies from backend
  useEffect(() => {
    loadCompaniesFromBackend();
  }, []);

  const loadCompaniesFromBackend = async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading companies from backend:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('companies');
        setCompanies(saved ? JSON.parse(saved) : mockCompanies);
      } else {
        console.log('✅ Empresas carregadas do backend:', data);
        
        // For each company, fetch the actual company admin user and assigned auditor
        const backendCompanies: Company[] = await Promise.all(
          data.map(async (c: any) => {
            // Fetch company admin for this company
            const adminData = await fetchCompanyAdmin(c.id);
            // Fetch assigned auditor for this company
            const auditorData = await fetchAssignedAuditor(c.id);
            
            return {
              id: c.id,
              name: c.name,
              cnpj: c.cnpj || '-',
              logo: null,
              admin: adminData,
              total_users: 1,
              created_at: c.created_at,
              last_activity: null,
              status: c.status,
              address: c.address || '-',
              city: c.city,
              state: c.state,
              phone: c.phone || '-',
              email: c.email, // Contact email of the company
              assigned_auditor: auditorData,
            };
          })
        );
        
        setCompanies(backendCompanies);
      }
    } catch (error) {
      console.error('Error in loadCompaniesFromBackend:', error);
      const saved = localStorage.getItem('companies');
      setCompanies(saved ? JSON.parse(saved) : mockCompanies);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  // Helper function to fetch the company admin user
  const fetchCompanyAdmin = async (companyId: string): Promise<{ name: string; email: string }> => {
    try {
      // Find users linked to this company
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', companyId);

      if (ucError || !userCompanies || userCompanies.length === 0) {
        return { name: '-', email: '-' };
      }

      // Check which of these users has company_admin role
      for (const uc of userCompanies) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uc.user_id)
          .eq('role', 'company_admin')
          .maybeSingle();

        if (!roleError && roleData) {
          // This user is a company admin, fetch their profile with email
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', uc.user_id)
            .maybeSingle();

          if (!profileError && profileData) {
            return {
              name: profileData.full_name || '-',
              email: profileData.email || '-',
            };
          }
        }
      }

      return { name: '-', email: '-' };
    } catch (error) {
      console.error('Error fetching company admin:', error);
      return { name: '-', email: '-' };
    }
  };

  // Helper function to fetch the assigned auditor for a company
  const fetchAssignedAuditor = async (companyId: string): Promise<{ name: string; email: string } | null> => {
    try {
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', companyId);

      if (ucError || !userCompanies || userCompanies.length === 0) {
        return null;
      }

      // Check which of these users has auditor role
      for (const uc of userCompanies) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uc.user_id)
          .eq('role', 'auditor')
          .maybeSingle();

        if (!roleError && roleData) {
          // This user is an auditor, fetch their profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', uc.user_id)
            .maybeSingle();

          if (!profileError && profileData) {
            return {
              name: profileData.full_name || '-',
              email: profileData.email || '-',
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching assigned auditor:', error);
      return null;
    }
  };

  // Load models from backend
  const [models, setModels] = useState<MasterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    loadModelsFromBackend();
  }, []);

  const loadModelsFromBackend = async () => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase
        .from('master_models')
        .select(`
          *,
          master_model_criteria(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading models from backend:', error);
        const saved = localStorage.getItem('masterModels');
        setModels(saved ? JSON.parse(saved) : mockModels);
      } else {
        console.log('✅ Modelos carregados do backend:', data);
        
        // Map backend data to MasterModel type
        const backendModels: MasterModel[] = await Promise.all(
          data.map(async (m: any) => {
            // Buscar critérios vinculados ao modelo
            const { data: criteriaData } = await supabase
              .from('master_model_criteria')
              .select(`
                criterion_id,
                master_criteria(senso)
              `)
              .eq('model_id', m.id);

            const criteriaIds = criteriaData?.map((c: any) => c.criterion_id) || [];
            const criteriaCount = criteriaIds.length;
            
            // Contar por senso
            const sensoCount = {
              "1S": 0,
              "2S": 0,
              "3S": 0,
              "4S": 0,
              "5S": 0,
            };

            criteriaData?.forEach((c: any) => {
              const sensos = c.master_criteria?.senso || [];
              sensos.forEach((s: string) => {
                if (s in sensoCount) {
                  sensoCount[s as keyof typeof sensoCount]++;
                }
              });
            });

            return {
              id: m.id,
              name: m.name,
              description: m.description || '',
              total_criteria: criteriaCount,
              criteria_by_senso: sensoCount,
              companies_using: 0, // TODO: calcular do company_models
              status: m.status,
              created_at: m.created_at,
              updated_at: m.updated_at,
              criteria_ids: criteriaIds,
            };
          })
        );
        
        setModels(backendModels);
      }
    } catch (error) {
      console.error('Error in loadModelsFromBackend:', error);
      const saved = localStorage.getItem('masterModels');
      setModels(saved ? JSON.parse(saved) : mockModels);
    } finally {
      setIsLoadingModels(false);
    }
  };
  const [activeTab, setActiveTab] = useState<"list" | "overview">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [assignModelsCompany, setAssignModelsCompany] = useState<Company | null>(null);
  const [assignAuditorsCompany, setAssignAuditorsCompany] = useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [toggleStatusCompany, setToggleStatusCompany] = useState<Company | null>(null);
  const [sendEmailCompany, setSendEmailCompany] = useState<Company | null>(null);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let filtered = [...companies];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cnpj.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "az":
          return a.name.localeCompare(b.name);
        case "za":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [companies, searchTerm, statusFilter, sortBy]);

  const handleSelectionChange = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedCompanies(checked ? filteredCompanies.map((c) => c.id) : []);
  };

  const handleSaveNewCompany = async (data: CompanyFormData) => {
    try {
      // First, insert the company in the backend
      const { data: newCompanyData, error } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          phone: data.phone,
          email: data.email,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating company in backend:', error);
        toast({
          title: "Erro ao criar empresa",
          description: "Não foi possível salvar a empresa no backend. Tente novamente.",
          variant: "destructive",
        });
        throw error;
      }

      console.log('✅ Empresa criada no backend:', newCompanyData);

      // Build the local Company object with backend ID
      const newCompany: Company = {
        id: newCompanyData.id, // Use backend UUID
        name: data.name,
        cnpj: '-',
        logo: null,
        admin: {
          name: data.adminName,
          email: data.adminEmail,
          temporaryPassword: data.temporaryPassword,
        },
        total_users: 1,
        created_at: newCompanyData.created_at,
        last_activity: null,
        status: 'active',
        address: '-',
        phone: data.phone,
        email: data.email,
      };

      // Add to local state (will be persisted in backend already)
      setCompanies([newCompany, ...companies]);
      
      toast({
        title: "✓ Empresa cadastrada com sucesso!",
        description: `${data.name} foi criada. Credenciais enviadas para ${data.adminEmail}`,
        className: "bg-green-50 border-green-200",
      });

      // Return backend company ID for auditor linking
      return newCompanyData.id;
    } catch (error) {
      console.error('Error in handleSaveNewCompany:', error);
      // Don't add to local state if backend failed
      throw error;
    }
  };

  const handleView = (company: Company) => {
    setViewCompany(company);
  };

  const handleEdit = (company: Company) => {
    setEditCompany(company);
  };

  const handleSaveEdit = async (data: CompanyFormData) => {
    if (!editCompany) return;
    
    try {
      // Update in backend
      const { error } = await supabase
        .from('companies')
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email,
        })
        .eq('id', editCompany.id);

      if (error) {
        console.error('Error updating company in backend:', error);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar a empresa no backend.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Empresa atualizada no backend');

      // Update local state
      setCompanies(companies.map(c => 
        c.id === editCompany.id ? {
          ...c,
          name: data.name,
          phone: data.phone,
          email: data.email,
          admin: {
            name: data.adminName,
            email: data.adminEmail,
          }
        } : c
      ));
      
      toast({
        title: "✓ Empresa atualizada com sucesso!",
        description: `${data.name} foi atualizada`,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error('Error in handleSaveEdit:', error);
    }
  };

  const handleAssignModels = (company: Company) => {
    setAssignModelsCompany(company);
  };

  const handleAssignAuditors = (company: Company) => {
    setAssignAuditorsCompany(company);
  };

  const handleSaveModels = async (linkedModels: string[]) => {
    if (!assignModelsCompany) return;
    
    try {
      // First, remove existing links for this company
      const { error: deleteError } = await supabase
        .from('company_models')
        .delete()
        .eq('company_id', assignModelsCompany.id);

      if (deleteError) {
        console.error('Error deleting old model links:', deleteError);
      }

      // Then, insert new links
      if (linkedModels.length > 0) {
        const modelLinks = linkedModels.map(modelId => ({
          company_id: assignModelsCompany.id,
          model_id: modelId,
          status: 'active',
          notify_admin: false,
        }));

        const { error: insertError } = await supabase
          .from('company_models')
          .insert(modelLinks);

        if (insertError) {
          console.error('Error inserting model links:', insertError);
          toast({
            title: "Erro ao vincular modelos",
            description: "Não foi possível salvar os vínculos no backend.",
            variant: "destructive",
          });
          return;
        }

        console.log('✅ Modelos vinculados no backend:', linkedModels);
      }

      toast({
        title: "✓ Modelos atualizados!",
        description: `${linkedModels.length} modelo(s) vinculado(s) com sucesso.`,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error('Error in handleSaveModels:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os vínculos.",
        variant: "destructive",
      });
    }
  };

  const handleCreateModel = async (newModel: Omit<MasterModel, "id" | "created_at" | "updated_at">) => {
    try {
      // Insert model in backend
      const { data: modelData, error } = await supabase
        .from('master_models')
        .insert({
          name: newModel.name,
          description: newModel.description,
          status: newModel.status,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating model in backend:', error);
        toast({
          title: "Erro ao criar modelo",
          description: "Não foi possível salvar o modelo no backend.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Modelo criado no backend:', modelData);

      // Insert criteria links if any
      if (newModel.criteria_ids && newModel.criteria_ids.length > 0) {
        const criteriaLinks = newModel.criteria_ids.map(criterionId => ({
          model_id: modelData.id,
          criterion_id: criterionId,
        }));

        const { error: linksError } = await supabase
          .from('master_model_criteria')
          .insert(criteriaLinks);

        if (linksError) {
          console.error('Error linking criteria:', linksError);
        }
      }

      // Reload models from backend to get fresh data
      await loadModelsFromBackend();
      
      toast({
        title: "✓ Modelo criado!",
        description: `${newModel.name} foi adicionado com sucesso.`,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error('Error in handleCreateModel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o modelo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = (company: Company) => {
    setToggleStatusCompany(company);
  };

  const handleConfirmToggleStatus = () => {
    if (!toggleStatusCompany) return;
    
    const newStatus = toggleStatusCompany.status === 'active' ? 'inactive' : 'active';
    setCompanies(companies.map(c => 
      c.id === toggleStatusCompany.id ? { ...c, status: newStatus } : c
    ));
    
    toast({
      title: newStatus === 'active' ? "Empresa ativada" : "Empresa desativada",
      description: `${toggleStatusCompany.name} está agora ${newStatus === 'active' ? 'ativa' : 'inativa'}`,
      className: newStatus === 'active' ? "bg-green-50 border-green-200" : "",
    });
  };

  const handleDelete = (company: Company) => {
    setDeleteCompany(company);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCompany) return;
    try {
      // Delete from backend first
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', deleteCompany.id);

      if (error) {
        console.error('Error deleting company in backend:', error);
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível remover a empresa no backend.',
          variant: 'destructive',
        });
        return;
      }

      // Update local state and notify
      setCompanies(companies.filter(c => c.id !== deleteCompany.id));
      toast({
        title: 'Empresa excluída permanentemente',
        description: `${deleteCompany.name} foi removida do sistema`,
        variant: 'destructive',
      });

      // Clear modal
      setDeleteCompany(null);
    } catch (err) {
      console.error('Error in handleConfirmDelete:', err);
      toast({
        title: 'Erro ao excluir',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = () => {
    if (!sendEmailCompany) return;
    
    toast({
      title: "✓ Email enviado com sucesso!",
      description: `Email enviado para ${sendEmailCompany.admin.email}`,
      className: "bg-green-50 border-green-200",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Empresas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Empresas</h1>
          <p className="text-muted-foreground">Gerencie suas empresas clientes e seus administradores</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <EmpresasTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        {activeTab === "list" ? (
          <>
            {/* Stats Cards */}
            <CompanyStatsCards companies={companies} />

            {/* Search and Filters */}
            <div className="mt-8">
              <CompanySearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                onNewCompany={() => setShowNewCompanyModal(true)}
              />
            </div>

            {/* Bulk Actions */}
            <div className="mt-6">
              <CompanyBulkActions
                selectedCount={selectedCompanies.length}
                onClearSelection={() => setSelectedCompanies([])}
                onAssignModels={() => {
                  if (selectedCompanies.length === 1) {
                    const company = companies.find(c => c.id === selectedCompanies[0]);
                    if (company) handleAssignModels(company);
                  } else {
                    toast({
                      title: "Atribuir modelos em massa",
                      description: "Funcionalidade disponível em breve para múltiplas empresas.",
                    });
                  }
                }}
                onDeactivate={() => {
                  setCompanies(companies.map(c =>
                    selectedCompanies.includes(c.id) ? { ...c, status: 'inactive' } : c
                  ));
                  toast({
                    title: "Empresas desativadas",
                    description: `${selectedCompanies.length} ${selectedCompanies.length === 1 ? "empresa foi desativada" : "empresas foram desativadas"}`,
                  });
                  setSelectedCompanies([]);
                }}
                onDelete={() => {
                  (async () => {
                    try {
                      if (selectedCompanies.length === 0) return;

                      // Delete in backend
                      const { error } = await supabase
                        .from('companies')
                        .delete()
                        .in('id', selectedCompanies);

                      if (error) {
                        console.error('Error deleting companies in backend:', error);
                        toast({
                          title: 'Erro ao excluir',
                          description: 'Não foi possível remover algumas empresas no backend.',
                          variant: 'destructive',
                        });
                        return;
                      }

                      const remaining = companies.filter(c => !selectedCompanies.includes(c.id));
                      const removedCount = companies.length - remaining.length;
                      setCompanies(remaining);
                      toast({
                        title: 'Empresas excluídas',
                        description: `${removedCount} ${removedCount === 1 ? 'empresa foi removida' : 'empresas foram removidas'}`,
                        variant: 'destructive',
                      });
                      setSelectedCompanies([]);
                    } catch (err) {
                      console.error('Error in bulk delete:', err);
                      toast({
                        title: 'Erro ao excluir',
                        description: 'Tente novamente em instantes.',
                        variant: 'destructive',
                      });
                    }
                  })();
                }}
              />
            </div>

            {/* Companies Cards */}
            <div className="mt-6">
              <CompanyCards
                companies={filteredCompanies}
                selectedCompanies={selectedCompanies}
                onSelectionChange={handleSelectionChange}
                onSelectAll={handleSelectAll}
                onView={handleView}
                onEdit={handleEdit}
                onAssignModels={handleAssignModels}
                onAssignAuditors={handleAssignAuditors}
              />
            </div>
          </>
        ) : (
          <CompanyOverviewDashboard companies={companies} models={models} />
        )}
      </main>

      {/* Modals */}
      <NewCompanyModal
        open={showNewCompanyModal}
        onOpenChange={setShowNewCompanyModal}
        onSave={handleSaveNewCompany}
      />
      
      <ViewCompanyModal
        company={viewCompany}
        open={!!viewCompany}
        onOpenChange={(open) => !open && setViewCompany(null)}
        onEdit={handleEdit}
      />

      <EditCompanyModal
        company={editCompany}
        open={!!editCompany}
        onOpenChange={(open) => !open && setEditCompany(null)}
        onSave={handleSaveEdit}
      />

      <AssignModelsModal
        company={assignModelsCompany}
        models={models}
        open={!!assignModelsCompany}
        onOpenChange={(open) => !open && setAssignModelsCompany(null)}
        onSave={handleSaveModels}
        onCreateModel={handleCreateModel}
      />

      <AssignAuditorsModal
        company={assignAuditorsCompany}
        open={!!assignAuditorsCompany}
        onOpenChange={(open) => !open && setAssignAuditorsCompany(null)}
        onSuccess={loadCompaniesFromBackend}
      />

      <DeleteCompanyDialog
        company={deleteCompany}
        open={!!deleteCompany}
        onOpenChange={(open) => !open && setDeleteCompany(null)}
        onConfirm={handleConfirmDelete}
      />

      <ToggleStatusDialog
        company={toggleStatusCompany}
        open={!!toggleStatusCompany}
        onOpenChange={(open) => !open && setToggleStatusCompany(null)}
        onConfirm={handleConfirmToggleStatus}
      />

      <SendEmailModal
        company={sendEmailCompany}
        open={!!sendEmailCompany}
        onOpenChange={(open) => !open && setSendEmailCompany(null)}
        onSend={handleSendEmail}
      />
    </div>
  );
}
