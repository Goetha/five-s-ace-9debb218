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
import { CompaniesTable } from "@/components/empresas/CompaniesTable";
import { CompanyOverviewDashboard } from "@/components/empresas/overview/CompanyOverviewDashboard";
import { NewCompanyModal } from "@/components/empresas/NewCompanyModal";
import { ViewCompanyModal } from "@/components/empresas/ViewCompanyModal";
import { EditCompanyModal } from "@/components/empresas/EditCompanyModal";
import { AssignModelsModal } from "@/components/empresas/AssignModelsModal";
import { DeleteCompanyDialog } from "@/components/empresas/DeleteCompanyDialog";
import { ToggleStatusDialog } from "@/components/empresas/ToggleStatusDialog";
import { SendEmailModal } from "@/components/empresas/SendEmailModal";
import { mockCompanies } from "@/data/mockCompanies";
import { mockModels } from "@/data/mockModels";
import { Company, CompanyFormData } from "@/types/company";
import { MasterModel } from "@/types/model";
import { useToast } from "@/hooks/use-toast";

export default function Empresas() {
  const { toast } = useToast();
  
  // Load companies from localStorage on mount
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('companies');
      return saved ? JSON.parse(saved) : mockCompanies;
    } catch {
      return mockCompanies;
    }
  });

  // Load models from localStorage on mount
  const [models, setModels] = useState<MasterModel[]>(() => {
    try {
      const saved = localStorage.getItem('models');
      return saved ? JSON.parse(saved) : mockModels;
    } catch {
      return mockModels;
    }
  });

  // Save companies to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('companies', JSON.stringify(companies));
  }, [companies]);

  // Save models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('models', JSON.stringify(models));
  }, [models]);
  const [activeTab, setActiveTab] = useState<"list" | "overview">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [assignModelsCompany, setAssignModelsCompany] = useState<Company | null>(null);
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

  const handleSaveNewCompany = (data: CompanyFormData) => {
    const newCompany: Company = {
      id: String(companies.length + 1).padStart(3, '0'),
      name: data.name,
      cnpj: '-',
      logo: null,
      admin: {
        name: data.adminName,
        email: data.adminEmail,
        temporaryPassword: data.temporaryPassword,
      },
      total_users: 1,
      created_at: new Date().toISOString(),
      last_activity: null,
      status: 'active',
      address: '-',
      phone: data.phone,
      email: data.email,
    };

    setCompanies([newCompany, ...companies]);
    
    toast({
      title: "✓ Empresa cadastrada com sucesso!",
      description: `${data.name} foi criada. Credenciais enviadas para ${data.adminEmail}`,
      className: "bg-green-50 border-green-200",
    });
  };

  const handleView = (company: Company) => {
    setViewCompany(company);
  };

  const handleEdit = (company: Company) => {
    setEditCompany(company);
  };

  const handleSaveEdit = (data: CompanyFormData) => {
    if (!editCompany) return;
    
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
  };

  const handleAssignModels = (company: Company) => {
    setAssignModelsCompany(company);
  };

  const handleSaveModels = (linkedModels: string[]) => {
    if (!assignModelsCompany) return;
    
    toast({
      title: "✓ Modelos atualizados!",
      description: `${linkedModels.length} modelos foram vinculados.`,
      className: "bg-green-50 border-green-200",
    });
  };

  const handleCreateModel = (newModel: Omit<MasterModel, "id" | "created_at" | "updated_at">) => {
    const model: MasterModel = {
      ...newModel,
      id: Math.random().toString(36).substring(2, 11),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setModels([...models, model]);
    
    toast({
      title: "✓ Modelo criado!",
      description: `${model.name} foi adicionado com sucesso.`,
      className: "bg-green-50 border-green-200",
    });
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

  const handleConfirmDelete = () => {
    if (!deleteCompany) return;
    
    setCompanies(companies.filter(c => c.id !== deleteCompany.id));
    
    toast({
      title: "Empresa excluída permanentemente",
      description: `${deleteCompany.name} foi removida do sistema`,
      variant: "destructive",
    });
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
                  const remaining = companies.filter(c => !selectedCompanies.includes(c.id));
                  const removedCount = companies.length - remaining.length;
                  setCompanies(remaining);
                  toast({
                    title: "Empresas excluídas",
                    description: `${removedCount} ${removedCount === 1 ? "empresa foi removida" : "empresas foram removidas"}`,
                    variant: "destructive",
                  });
                  setSelectedCompanies([]);
                }}
              />
            </div>

            {/* Companies Table */}
            <div className="mt-6">
              <CompaniesTable
                companies={filteredCompanies}
                selectedCompanies={selectedCompanies}
                onSelectionChange={handleSelectionChange}
                onSelectAll={handleSelectAll}
                onView={handleView}
                onEdit={handleEdit}
                onAssignModels={handleAssignModels}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onSendEmail={setSendEmailCompany}
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
