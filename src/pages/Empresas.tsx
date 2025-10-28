import { useState, useMemo } from "react";
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
import { CompanyStatsCards } from "@/components/empresas/CompanyStatsCards";
import { CompanySearchBar } from "@/components/empresas/CompanySearchBar";
import { CompaniesTable } from "@/components/empresas/CompaniesTable";
import { NewCompanyModal } from "@/components/empresas/NewCompanyModal";
import { mockCompanies } from "@/data/mockCompanies";
import { Company, CompanyFormData } from "@/types/company";
import { useToast } from "@/hooks/use-toast";

export default function Empresas() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);

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
      cnpj: data.cnpj,
      logo: null,
      admin: {
        name: data.adminName,
        email: data.adminEmail,
      },
      total_users: 1,
      created_at: new Date().toISOString(),
      last_activity: null,
      status: data.status,
      address: data.address,
      city: data.city,
      state: data.state,
      cep: data.cep,
      phone: data.phone,
      email: data.email,
    };

    setCompanies([newCompany, ...companies]);
    
    toast({
      title: "✓ Empresa cadastrada com sucesso!",
      description: data.sendCredentials 
        ? `Email enviado para ${data.adminEmail}` 
        : "Empresa criada sem envio de credenciais",
      className: "bg-green-50 border-green-200",
    });
  };

  const handleView = (company: Company) => {
    console.log("View company:", company);
    // TODO: Implement view modal
  };

  const handleEdit = (company: Company) => {
    console.log("Edit company:", company);
    // TODO: Implement edit modal
  };

  const handleAssignModels = (company: Company) => {
    console.log("Assign models to:", company);
    // TODO: Implement assign models modal
  };

  const handleToggleStatus = (company: Company) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    setCompanies(companies.map(c => 
      c.id === company.id ? { ...c, status: newStatus } : c
    ));
    
    toast({
      title: newStatus === 'active' ? "Empresa ativada" : "Empresa desativada",
      description: `${company.name} está agora ${newStatus === 'active' ? 'ativa' : 'inativa'}`,
    });
  };

  const handleDelete = (company: Company) => {
    console.log("Delete company:", company);
    // TODO: Implement delete confirmation modal
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Empresas</h1>
          <p className="text-gray-600">Gerencie suas empresas clientes e seus administradores</p>
        </div>

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
          />
        </div>
      </main>

      {/* New Company Modal */}
      <NewCompanyModal
        open={showNewCompanyModal}
        onOpenChange={setShowNewCompanyModal}
        onSave={handleSaveNewCompany}
      />
    </div>
  );
}
