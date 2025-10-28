import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import StatsCards from "@/components/biblioteca/StatsCards";
import SearchAndFilters from "@/components/biblioteca/SearchAndFilters";
import AdvancedFilters from "@/components/biblioteca/AdvancedFilters";
import SensoTabs from "@/components/biblioteca/SensoTabs";
import CriteriaTable from "@/components/biblioteca/CriteriaTable";
import BulkActions from "@/components/biblioteca/BulkActions";
import Pagination from "@/components/biblioteca/Pagination";
import CriterionFormModal from "@/components/biblioteca/CriterionFormModal";
import { mockCriteria } from "@/data/mockCriteria";
import { Criteria, CriteriaFilters, SensoType } from "@/types/criteria";
import { useToast } from "@/hooks/use-toast";

const BibliotecaCriterios = () => {
  const { toast } = useToast();
  
  // State management
  const [criteria, setCriteria] = useState<Criteria[]>(mockCriteria);
  const [searchValue, setSearchValue] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<SensoType | "Todos">("Todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState<CriteriaFilters>({
    search: "",
    senso: "Todos",
    scoreType: "Todos",
    weightRange: "Todos",
    tags: [],
    status: "Todos",
  });

  // Filter criteria based on all filters
  const filteredCriteria = useMemo(() => {
    let result = [...criteria];

    // Search filter
    if (searchValue.trim()) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // Tab filter (senso)
    if (activeTab !== "Todos") {
      result = result.filter((c) => c.senso === activeTab);
    }

    // Advanced filters
    if (filters.senso !== "Todos") {
      result = result.filter((c) => c.senso === filters.senso);
    }

    if (filters.scoreType !== "Todos") {
      result = result.filter((c) => c.scoreType === filters.scoreType);
    }

    if (filters.weightRange !== "Todos") {
      result = result.filter((c) => {
        if (filters.weightRange === "Alto") return c.weight >= 8;
        if (filters.weightRange === "Médio") return c.weight >= 4 && c.weight < 8;
        if (filters.weightRange === "Baixo") return c.weight < 4;
        return true;
      });
    }

    if (filters.tags.length > 0) {
      result = result.filter((c) =>
        filters.tags.some((tag) => c.tags.includes(tag))
      );
    }

    if (filters.status !== "Todos") {
      result = result.filter((c) => c.status === filters.status);
    }

    return result;
  }, [criteria, searchValue, activeTab, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredCriteria.length / itemsPerPage);
  const paginatedCriteria = filteredCriteria.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedCriteria.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  // Handle new criterion save
  const handleSaveCriterion = (newCriterion: Omit<Criteria, "id" | "companiesUsing" | "modelsUsing">) => {
    // Generate new ID (next sequential number)
    const maxId = Math.max(...criteria.map((c) => parseInt(c.id)), 0);
    const newId = String(maxId + 1).padStart(3, "0");

    const criterionToAdd: Criteria = {
      ...newCriterion,
      id: newId,
      companiesUsing: 0,
      modelsUsing: 0,
    };

    // Add to the beginning of the list
    setCriteria([criterionToAdd, ...criteria]);

    // Show success toast
    toast({
      title: "✓ Critério criado com sucesso!",
      description: `${newCriterion.name} foi adicionado à biblioteca.`,
      duration: 3000,
    });

    // Reset selections and go to first page
    setSelectedIds([]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            Biblioteca de Critérios
          </span>
        </nav>

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Biblioteca de Critérios Mestre
          </h1>
          <p className="text-muted-foreground">
            Base de conhecimento 5S global
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards criteria={criteria} />

        {/* Search and Filters */}
        <SearchAndFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          showFilters={showAdvancedFilters}
          onNewCriterion={() => setIsModalOpen(true)}
        />

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowAdvancedFilters(false)}
          />
        )}

        {/* Senso Tabs */}
        <SensoTabs
          criteria={filteredCriteria}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
        />

        {/* Bulk Actions */}
        <BulkActions
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
        />

        {/* Criteria Table */}
        <CriteriaTable
          criteria={paginatedCriteria}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
        />

        {/* Pagination */}
        {filteredCriteria.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCriteria.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        )}

        {/* Criterion Form Modal */}
        <CriterionFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCriterion}
        />
      </main>
    </div>
  );
};

export default BibliotecaCriterios;
