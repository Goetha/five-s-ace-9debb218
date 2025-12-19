import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import ModelStatsCards from "@/components/modelos/ModelStatsCards";
import ModelCard from "@/components/modelos/ModelCard";
import NewModelModal from "@/components/modelos/NewModelModal";
import ModelDetailsModal from "@/components/modelos/ModelDetailsModal";
import EditModelModal from "@/components/modelos/EditModelModal";
import LinkCompaniesModal from "@/components/modelos/LinkCompaniesModal";
import { StatsCardsSkeleton4, ModelCardsSkeleton, SearchBarSkeleton } from "@/components/biblioteca/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import { MasterModel, ModelFilters } from "@/types/model";
import { Card, CardContent } from "@/components/ui/card";

const ModelosMestre = () => {
  const { toast } = useToast();
  const [models, setModels] = useState<MasterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ModelFilters>({
    search: "",
    status: "Todos",
  });
  const [newModelOpen, setNewModelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MasterModel | null>(null);

  // Load models from Supabase
  const fetchModels = async () => {
    try {
      setLoading(true);
      
      // Fetch models
      const { data: modelsData, error: modelsError } = await supabase
        .from("master_models")
        .select("*")
        .order("created_at", { ascending: false });

      if (modelsError) throw modelsError;

      // Fetch model criteria links
      const { data: modelCriteriaData, error: criteriaError } = await supabase
        .from("master_model_criteria")
        .select("model_id, criterion_id");

      if (criteriaError) throw criteriaError;

      // Fetch company models to count companies using each model
      const { data: companyModelsData, error: companyModelsError } = await supabase
        .from("company_models")
        .select("model_id, status")
        .eq("status", "active");

      if (companyModelsError) throw companyModelsError;

      // Transform data to match MasterModel interface
      const transformedModels: MasterModel[] = (modelsData || []).map((model) => {
        const criteriaIds = (modelCriteriaData || [])
          .filter((mc) => mc.model_id === model.id)
          .map((mc) => mc.criterion_id);

        const companiesUsing = (companyModelsData || []).filter(
          (cm) => cm.model_id === model.id
        ).length;

        // Count criteria by senso (we'll need to fetch criteria details)
        const criteria_by_senso = {
          "1S": 0,
          "2S": 0,
          "3S": 0,
          "4S": 0,
          "5S": 0,
        };

        return {
          id: model.id,
          name: model.name,
          description: model.description || "",
          status: model.status as "active" | "inactive",
          total_criteria: criteriaIds.length,
          criteria_by_senso,
          companies_using: companiesUsing,
          created_at: model.created_at,
          updated_at: model.updated_at,
          criteria_ids: criteriaIds,
        };
      });

      // Fetch criteria to get senso counts
      if (transformedModels.length > 0) {
        const allCriteriaIds = transformedModels.flatMap((m) => m.criteria_ids);
        
        if (allCriteriaIds.length > 0) {
          const { data: criteriaData, error: criteriaDetailsError } = await supabase
            .from("master_criteria")
            .select("id, senso")
            .in("id", allCriteriaIds);

          if (!criteriaDetailsError && criteriaData) {
            transformedModels.forEach((model) => {
              const modelCriteria = criteriaData.filter((c) =>
                model.criteria_ids.includes(c.id)
              );

              model.criteria_by_senso = {
                "1S": modelCriteria.filter((c) => c.senso.includes("1S")).length,
                "2S": modelCriteria.filter((c) => c.senso.includes("2S")).length,
                "3S": modelCriteria.filter((c) => c.senso.includes("3S")).length,
                "4S": modelCriteria.filter((c) => c.senso.includes("4S")).length,
                "5S": modelCriteria.filter((c) => c.senso.includes("5S")).length,
              };
            });
          }
        }
      }

      setModels(transformedModels);
    } catch (error: any) {
      console.error("Error fetching models:", error);
      toast({
        title: "Erro ao carregar modelos",
        description: error.message || "Ocorreu um erro ao buscar os modelos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      model.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus =
      filters.status === "Todos" ||
      (filters.status === "Ativo" && model.status === "active") ||
      (filters.status === "Inativo" && model.status === "inactive");
    return matchesSearch && matchesStatus;
  });

  const handleSaveModel = async (data: any) => {
    try {
      // Insert model
      const { data: modelData, error: modelError } = await supabase
        .from("master_models")
        .insert({
          name: data.name,
          description: data.description,
          status: data.status,
        })
        .select()
        .single();

      if (modelError) throw modelError;

      // Insert model-criteria links
      if (data.criteria_ids && data.criteria_ids.length > 0) {
        const criteriaLinks = data.criteria_ids.map((criterionId: string) => ({
          model_id: modelData.id,
          criterion_id: criterionId,
        }));

        const { error: linksError } = await supabase
          .from("master_model_criteria")
          .insert(criteriaLinks);

        if (linksError) throw linksError;
      }

      toast({
        title: "✓ Modelo criado com sucesso!",
        description: `O modelo "${data.name}" foi criado.`,
      });

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error creating model:", error);
      toast({
        title: "Erro ao criar modelo",
        description: error.message || "Ocorreu um erro ao criar o modelo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const model = models.find((m) => m.id === id);
      if (!model) return;

      const newStatus = model.status === "active" ? "inactive" : "active";

      const { error } = await supabase
        .from("master_models")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do modelo foi alterado.",
      });

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error toggling status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const model = models.find((m) => m.id === id);
      if (model && model.companies_using > 0) {
        toast({
          title: "⚠️ Não é possível excluir",
          description: `Este modelo está sendo usado por ${model.companies_using} empresas. Remova os vínculos primeiro.`,
          variant: "destructive",
        });
        return;
      }

      // Delete model-criteria links first
      const { error: linksError } = await supabase
        .from("master_model_criteria")
        .delete()
        .eq("model_id", id);

      if (linksError) throw linksError;

      // Delete model
      const { error: modelError } = await supabase
        .from("master_models")
        .delete()
        .eq("id", id);

      if (modelError) throw modelError;

      toast({
        title: "✓ Modelo excluído",
        description: "O modelo foi excluído com sucesso.",
      });

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error deleting model:", error);
      toast({
        title: "Erro ao excluir modelo",
        description: error.message || "Ocorreu um erro ao excluir o modelo.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const model = models.find((m) => m.id === id);
      if (!model) return;

      // Create duplicate model
      const { data: duplicateModel, error: modelError } = await supabase
        .from("master_models")
        .insert({
          name: `${model.name} (Cópia)`,
          description: model.description,
          status: "inactive",
        })
        .select()
        .single();

      if (modelError) throw modelError;

      // Copy criteria links
      if (model.criteria_ids.length > 0) {
        const criteriaLinks = model.criteria_ids.map((criterionId) => ({
          model_id: duplicateModel.id,
          criterion_id: criterionId,
        }));

        const { error: linksError } = await supabase
          .from("master_model_criteria")
          .insert(criteriaLinks);

        if (linksError) throw linksError;
      }

      toast({
        title: "✓ Modelo duplicado",
        description: `Cópia criada: "${duplicateModel.name}"`,
      });

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error duplicating model:", error);
      toast({
        title: "Erro ao duplicar modelo",
        description: error.message || "Ocorreu um erro ao duplicar o modelo.",
        variant: "destructive",
      });
    }
  };

  const handleEditModel = async (data: any) => {
    if (!selectedModel) return;

    try {
      // Update model
      const { error: modelError } = await supabase
        .from("master_models")
        .update({
          name: data.name,
          description: data.description,
          status: data.status,
        })
        .eq("id", selectedModel.id);

      if (modelError) throw modelError;

      // Delete existing criteria links
      const { error: deleteError } = await supabase
        .from("master_model_criteria")
        .delete()
        .eq("model_id", selectedModel.id);

      if (deleteError) throw deleteError;

      // Insert new criteria links
      if (data.criteria_ids && data.criteria_ids.length > 0) {
        const criteriaLinks = data.criteria_ids.map((criterionId: string) => ({
          model_id: selectedModel.id,
          criterion_id: criterionId,
        }));

        const { error: linksError } = await supabase
          .from("master_model_criteria")
          .insert(criteriaLinks);

        if (linksError) throw linksError;
      }

      toast({
        title: "✓ Modelo atualizado",
        description: `O modelo "${data.name}" foi atualizado com sucesso.`,
      });

      setEditOpen(false);
      setSelectedModel(null);

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error updating model:", error);
      toast({
        title: "Erro ao atualizar modelo",
        description: error.message || "Ocorreu um erro ao atualizar o modelo.",
        variant: "destructive",
      });
    }
  };

  const handleLinkCompanies = async (modelId: string, companyIds: string[]) => {
    try {
      // Delete existing company links for this model
      const { error: deleteError } = await supabase
        .from("company_models")
        .delete()
        .eq("model_id", modelId);

      if (deleteError) throw deleteError;

      // Insert new company links
      if (companyIds.length > 0) {
        const companyLinks = companyIds.map((companyId) => ({
          company_id: companyId,
          model_id: modelId,
          status: "active",
        }));

        const { error: linksError } = await supabase
          .from("company_models")
          .insert(companyLinks);

        if (linksError) throw linksError;
      }

      toast({
        title: "✓ Empresas vinculadas",
        description: `${companyIds.length} empresa(s) vinculada(s) ao modelo com sucesso.`,
      });

      // Refresh models list
      fetchModels();
    } catch (error: any) {
      console.error("Error linking companies:", error);
      toast({
        title: "Erro ao vincular empresas",
        description: error.message || "Ocorreu um erro ao vincular as empresas.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb className="animate-element">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Modelos Mestre</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="animate-element animate-delay-100">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Modelos Mestre de Avaliação
          </h1>
          <p className="text-muted-foreground">
            Crie templates de avaliação 5S para suas empresas clientes
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <StatsCardsSkeleton4 />
        ) : (
          <div className="animate-element animate-delay-200">
            <ModelStatsCards models={models} />
          </div>
        )}

        {/* Search and Filters */}
        {loading ? (
          <SearchBarSkeleton />
        ) : (
          <div className="animate-element animate-delay-300 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar modelos..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value: any) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Status: Todos</SelectItem>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setNewModelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo
            </Button>
          </div>
        )}

        {/* Models Grid */}
        {loading ? (
          <ModelCardsSkeleton count={6} />
        ) : filteredModels.length > 0 ? (
          <div className="animate-element animate-delay-400 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model, index) => (
              <ModelCard
                key={model.id}
                model={model}
                onViewDetails={() => {
                  setSelectedModel(model);
                  setDetailsOpen(true);
                }}
                onEdit={() => {
                  setSelectedModel(model);
                  setEditOpen(true);
                }}
                onLink={() => {
                  setSelectedModel(model);
                  setLinkOpen(true);
                }}
                onDuplicate={() => handleDuplicate(model.id)}
                onToggleStatus={() => handleToggleStatus(model.id)}
                onDelete={() => handleDelete(model.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {filters.search || filters.status !== "Todos"
                ? "Nenhum modelo encontrado"
                : "Nenhum modelo criado ainda"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {filters.search || filters.status !== "Todos"
                ? "Tente ajustar os filtros de busca"
                : "Modelos Mestre são templates de avaliação 5S que suas empresas clientes poderão usar."}
            </p>
            {!filters.search && filters.status === "Todos" && (
              <Button onClick={() => setNewModelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Modelo
              </Button>
            )}
          </div>
        )}
      </main>

      {/* New Model Modal */}
      <NewModelModal
        open={newModelOpen}
        onOpenChange={setNewModelOpen}
        onSave={handleSaveModel}
      />

      {/* Details Modal */}
      <ModelDetailsModal
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedModel(null);
        }}
        model={selectedModel}
      />

      {/* Edit Modal */}
      <EditModelModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedModel(null);
        }}
        model={selectedModel}
        onSave={handleEditModel}
      />

      {/* Link Companies Modal */}
      <LinkCompaniesModal
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) setSelectedModel(null);
        }}
        model={selectedModel}
        onSave={handleLinkCompanies}
      />
    </div>
  );
};

export default ModelosMestre;
