import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import StatsCards from "@/components/biblioteca/StatsCards";
import SearchAndFilters from "@/components/biblioteca/SearchAndFilters";
import AdvancedFilters from "@/components/biblioteca/AdvancedFilters";
import SensoTabs from "@/components/biblioteca/SensoTabs";
import CriteriaCards from "@/components/biblioteca/CriteriaCards";
import BulkActions from "@/components/biblioteca/BulkActions";
import Pagination from "@/components/biblioteca/Pagination";
import CriterionFormModal from "@/components/biblioteca/CriterionFormModal";
import ViewCriterionModal from "@/components/biblioteca/ViewCriterionModal";
import { Criteria, CriteriaFilters, SensoType } from "@/types/criteria";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toUiStatus, toDbStatus, normalizeSenso } from "@/lib/formatters";
import { StatsCardsSkeleton, CriteriaCardsSkeleton } from "@/components/biblioteca/SkeletonCards";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { useOfflineData } from "@/hooks/useOfflineData";

const BibliotecaCriterios = () => {
  const { toast } = useToast();
  
  // State management - Load criteria from Supabase
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<SensoType | "Todos">("Todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCriterion, setViewCriterion] = useState<Criteria | null>(null);
  const [editCriterion, setEditCriterion] = useState<Criteria | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string | null>(null);

  // Offline-aware data fetching for master criteria
  const fetchMasterCriteriaOnline = useCallback(async () => {
    const { data, error } = await supabase
      .from("master_criteria")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const { 
    isOffline, 
    isFromCache, 
    lastSyncAt,
    refetch: refetchOfflineData 
  } = useOfflineData({
    cacheKey: 'master_criteria',
    fetchOnline: fetchMasterCriteriaOnline,
    enabled: !filterCompanyId, // Only cache global criteria
  });

  // Load criteria from Supabase on mount and when filter changes
  useEffect(() => {
    loadCriteria();
  }, [filterCompanyId]);

  const loadCriteria = async () => {
    setIsLoading(true);
    try {
      if (filterCompanyId) {
        // If filtering by company, get criteria from that company only
        const { data, error } = await supabase
          .from("company_criteria")
          .select("*")
          .eq("company_id", filterCompanyId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const normalizedCriteria: Criteria[] = (data || []).map((c: any): Criteria => ({
          id: c.id,
          name: c.name,
          senso: normalizeSenso(c.senso) as SensoType[],
          scoreType: c.scoring_type,
          tags: c.tags || [],
          status: toUiStatus(c.status),
          companiesUsing: 0,
          modelsUsing: 0,
          isGlobal: false,
        }));

        setCriteria(normalizedCriteria);
      } else {
        // No filter - Load both master_criteria (global) and company_criteria
        const [masterResult, companyResult] = await Promise.all([
          supabase
            .from("master_criteria")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false }),
          supabase
            .from("company_criteria")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false })
        ]);

        if (masterResult.error) throw masterResult.error;
        if (companyResult.error) throw companyResult.error;

        const masterCriteria: Criteria[] = (masterResult.data || []).map((c: any): Criteria => ({
          id: c.id,
          name: c.name,
          senso: normalizeSenso(c.senso) as SensoType[],
          scoreType: c.scoring_type,
          tags: c.tags || [],
          status: toUiStatus(c.status),
          companiesUsing: 0,
          modelsUsing: 0,
          isGlobal: true,
        }));

        const companyCriteria: Criteria[] = (companyResult.data || []).map((c: any): Criteria => ({
          id: c.id,
          name: c.name,
          senso: normalizeSenso(c.senso) as SensoType[],
          scoreType: c.scoring_type,
          tags: c.tags || [],
          status: toUiStatus(c.status),
          companiesUsing: 0,
          modelsUsing: 0,
          isGlobal: false,
        }));

        // Combine: global first, then company-specific
        setCriteria([...masterCriteria, ...companyCriteria]);
      }
    } catch (error) {
      console.error("Error loading criteria:", error);
      toast({
        title: "Erro ao carregar critérios",
        description: "Não foi possível carregar os critérios do banco de dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter criteria based on search and tab only
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
      result = result.filter((c) => c.senso.includes(activeTab as any));
    }

    return result;
  }, [criteria, searchValue, activeTab]);

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
  const handleSaveCriterion = async (newCriterion: Omit<Criteria, "id" | "companiesUsing" | "modelsUsing">, companyId: string) => {
    try {
      // Check if offline
      const isOfflineMode = !navigator.onLine;
      
      if (editCriterion) {
        if (isOfflineMode) {
          toast({
            title: "Não disponível offline",
            description: "A edição de critérios só está disponível online.",
            variant: "destructive",
          });
          return;
        }
        
        // Update existing criterion in company_criteria
        const { error } = await supabase
          .from("company_criteria")
          .update({
            name: newCriterion.name,
            description: "",
            senso: newCriterion.senso,
            scoring_type: newCriterion.scoreType,
            tags: newCriterion.tags,
            status: toDbStatus(newCriterion.status),
          })
          .eq("id", editCriterion.id);

        if (error) throw error;

        toast({
          title: "✓ Critério atualizado com sucesso!",
          description: `${newCriterion.name} foi atualizado.`,
          duration: 3000,
        });

        setEditCriterion(null);
      } else if (companyId) {
        // Create new criterion for specific company
        if (isOfflineMode) {
          // OFFLINE MODE: Save locally
          const { createOfflineCriterion } = await import('@/lib/offlineStorage');
          
          await createOfflineCriterion({
            company_id: companyId,
            name: newCriterion.name,
            description: null,
            senso: newCriterion.senso,
            scoring_type: newCriterion.scoreType,
            origin: 'custom',
            status: 'active',
            tags: newCriterion.tags || null,
          });

          toast({
            title: "✓ Critério salvo localmente!",
            description: `${newCriterion.name} será sincronizado quando você voltar online.`,
            duration: 3000,
          });

          setSelectedIds([]);
          setCurrentPage(1);
          return;
        }
        
        // ONLINE MODE: Save to Supabase
        const { error } = await supabase
          .from("company_criteria")
          .insert({
            company_id: companyId,
            name: newCriterion.name,
            description: "",
            senso: newCriterion.senso,
            scoring_type: newCriterion.scoreType,
            tags: newCriterion.tags,
            status: toDbStatus(newCriterion.status),
            origin: "custom",
          });

        if (error) throw error;

        // Get company name for feedback
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single();

        toast({
          title: "✓ Critério criado com sucesso!",
          description: `${newCriterion.name} foi adicionado à ${company?.name || "empresa"}.`,
          duration: 3000,
        });

        setSelectedIds([]);
        setCurrentPage(1);
      } else {
        // Create global criterion in master_criteria (all companies)
        if (isOfflineMode) {
          toast({
            title: "Não disponível offline",
            description: "Critérios globais só podem ser criados online.",
            variant: "destructive",
          });
          return;
        }
        
        const { error } = await supabase
          .from("master_criteria")
          .insert({
            name: newCriterion.name,
            description: "",
            senso: newCriterion.senso,
            scoring_type: newCriterion.scoreType,
            tags: newCriterion.tags,
            status: toDbStatus(newCriterion.status),
          });

        if (error) throw error;

        toast({
          title: "✓ Critério global criado!",
          description: `${newCriterion.name} está disponível para todas as empresas.`,
          duration: 3000,
        });

        setSelectedIds([]);
        setCurrentPage(1);
      }

      // Reload criteria from backend
      await loadCriteria();
    } catch (error) {
      console.error("Error saving criterion:", error);
      toast({
        title: "Erro ao salvar critério",
        description: "Não foi possível salvar o critério. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle view criterion
  const handleViewCriterion = (criterion: Criteria) => {
    setViewCriterion(criterion);
  };

  // Handle edit criterion
  const handleEditCriterion = (criterion: Criteria) => {
    setEditCriterion(criterion);
    setIsModalOpen(true);
  };

  // Handle duplicate criterion
  const handleDuplicateCriterion = async (criterion: Criteria) => {
    try {
      // Get the original criterion's company_id
      const { data: originalCriterion } = await supabase
        .from("company_criteria")
        .select("company_id")
        .eq("id", criterion.id)
        .single();

      if (!originalCriterion?.company_id) {
        throw new Error("Critério original não encontrado");
      }

      const { error } = await supabase
        .from("company_criteria")
        .insert({
          company_id: originalCriterion.company_id,
          name: `${criterion.name} (Cópia)`,
          description: "",
          senso: criterion.senso,
          scoring_type: criterion.scoreType,
          tags: criterion.tags,
          status: "active",
          origin: "custom",
        });

      if (error) throw error;

      toast({
        title: "✓ Critério duplicado com sucesso!",
        description: `${criterion.name} foi duplicado.`,
        duration: 3000,
      });

      setCurrentPage(1);
      await loadCriteria();
    } catch (error) {
      console.error("Error duplicating criterion:", error);
      toast({
        title: "Erro ao duplicar critério",
        description: "Não foi possível duplicar o critério. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditCriterion(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Offline Banner */}
        <OfflineBanner 
          isOffline={isOffline}
          isFromCache={isFromCache}
          lastSyncAt={lastSyncAt}
          onRefresh={() => {
            refetchOfflineData();
            loadCriteria();
          }}
        />

        {/* Breadcrumb */}
        <nav className="animate-element flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            Biblioteca de Critérios
          </span>
        </nav>

        {/* Page Header */}
        <div className="animate-element animate-delay-100">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Biblioteca de Critérios Mestre
          </h1>
          <p className="text-muted-foreground">
            Base de conhecimento 5S global
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <StatsCardsSkeleton />
        ) : (
          <div className="animate-element animate-delay-200">
            <StatsCards criteria={criteria} />
          </div>
        )}

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
            companyId={filterCompanyId}
            onCompanyChange={(companyId) => {
              setFilterCompanyId(companyId);
              setCurrentPage(1);
            }}
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
          onAddTags={async () => {
            try {
              const updates = selectedIds.map(id => {
                const criterion = criteria.find(c => c.id === id);
                if (!criterion) return null;
                
                const newTags = criterion.tags.includes("Industrial") 
                  ? criterion.tags 
                  : [...criterion.tags, "Industrial"];
                
                return supabase
                  .from("company_criteria")
                  .update({ tags: newTags })
                  .eq("id", id);
              });
              
              await Promise.all(updates.filter(Boolean));
              await loadCriteria();
              
              toast({
                title: "Tags adicionadas",
                description: `${selectedIds.length} ${selectedIds.length === 1 ? "item" : "itens"} receberam a tag "Industrial".`,
                duration: 3000,
              });
            } catch (error) {
              console.error("Error adding tags:", error);
              toast({
                title: "Erro ao adicionar tags",
                description: "Não foi possível adicionar as tags.",
                variant: "destructive",
              });
            }
          }}
          onAddToModel={() => {
            toast({
              title: "Adicionar a Modelo",
              description: "Ação disponível em breve.",
              duration: 3000,
            });
          }}
          onDeactivate={async () => {
            try {
              const updates = selectedIds.map(id =>
                supabase
                  .from("company_criteria")
                  .update({ status: "inactive" })
                  .eq("id", id)
              );
              
              await Promise.all(updates);
              await loadCriteria();
              
              toast({
                title: "Itens desativados",
                description: `${selectedIds.length} ${selectedIds.length === 1 ? "item" : "itens"} marcados como Inativo.`,
                duration: 3000,
              });
              
              setSelectedIds([]);
            } catch (error) {
              console.error("Error deactivating criteria:", error);
              toast({
                title: "Erro ao desativar",
                description: "Não foi possível desativar os critérios.",
                variant: "destructive",
              });
            }
          }}
          onDelete={async () => {
            try {
              const { error } = await supabase
                .from("company_criteria")
                .delete()
                .in("id", selectedIds);
              
              if (error) throw error;
              
              await loadCriteria();
              setSelectedIds([]);
              
              toast({
                title: "Itens excluídos",
                description: `${selectedIds.length} ${selectedIds.length === 1 ? "item" : "itens"} removidos da biblioteca.`,
                duration: 3000,
              });
            } catch (error) {
              console.error("Error deleting criteria:", error);
              toast({
                title: "Erro ao excluir",
                description: "Não foi possível excluir os critérios.",
                variant: "destructive",
              });
            }
          }}
        />

        {/* Criteria Cards */}
        {isLoading ? (
          <CriteriaCardsSkeleton count={6} />
        ) : (
          <div className="animate-element animate-delay-400">
            <CriteriaCards
              criteria={paginatedCriteria}
              selectedIds={selectedIds}
              onSelectOne={handleSelectOne}
              onView={handleViewCriterion}
              onEdit={handleEditCriterion}
              onDuplicate={handleDuplicateCriterion}
            />
          </div>
        )}

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
          onClose={handleCloseModal}
          onSave={handleSaveCriterion}
          criterion={editCriterion}
          mode={editCriterion ? "edit" : "create"}
          preSelectedCompanyId={filterCompanyId}
        />

        {/* View Criterion Modal */}
        <ViewCriterionModal
          open={!!viewCriterion}
          onClose={() => setViewCriterion(null)}
          criterion={viewCriterion}
          onEdit={() => {
            if (viewCriterion) {
              setViewCriterion(null);
              handleEditCriterion(viewCriterion);
            }
          }}
        />
      </main>
    </div>
  );
};

export default BibliotecaCriterios;
