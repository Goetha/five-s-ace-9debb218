import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { mockModels } from "@/data/mockModels";
import ModelStatsCards from "@/components/modelos/ModelStatsCards";
import ModelCard from "@/components/modelos/ModelCard";
import NewModelModal from "@/components/modelos/NewModelModal";
import ModelDetailsModal from "@/components/modelos/ModelDetailsModal";
import EditModelModal from "@/components/modelos/EditModelModal";
import LinkCompaniesModal from "@/components/modelos/LinkCompaniesModal";
import { useToast } from "@/hooks/use-toast";
import { MasterModel, ModelFilters } from "@/types/model";

const ModelosMestre = () => {
  const { toast } = useToast();
  const [models, setModels] = useState<MasterModel[]>([]);
  const [filters, setFilters] = useState<ModelFilters>({
    search: "",
    status: "Todos",
  });
  const [newModelOpen, setNewModelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MasterModel | null>(null);

  // Load models from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("masterModels");
    if (stored) {
      setModels(JSON.parse(stored));
    }
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

  const handleSaveModel = (data: any) => {
    const newModel: MasterModel = {
      id: String(models.length + 1).padStart(3, "0"),
      name: data.name,
      description: data.description,
      status: data.status,
      total_criteria: data.total_criteria,
      criteria_by_senso: data.criteria_by_senso,
      companies_using: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      criteria_ids: data.criteria_ids,
    };

    const updatedModels = [newModel, ...models];
    setModels(updatedModels);
    localStorage.setItem("masterModels", JSON.stringify(updatedModels));
    
    toast({
      title: "✓ Modelo criado com sucesso!",
      description: `O modelo "${data.name}" foi criado.`,
    });
  };

  const handleToggleStatus = (id: string) => {
    const updatedModels = models.map((m) =>
      m.id === id
        ? { ...m, status: (m.status === "active" ? "inactive" : "active") as "active" | "inactive" }
        : m
    );
    setModels(updatedModels);
    localStorage.setItem("masterModels", JSON.stringify(updatedModels));
    
    toast({
      title: "Status atualizado",
      description: "O status do modelo foi alterado.",
    });
  };

  const handleDelete = (id: string) => {
    const model = models.find((m) => m.id === id);
    if (model && model.companies_using > 0) {
      toast({
        title: "⚠️ Não é possível excluir",
        description: `Este modelo está sendo usado por ${model.companies_using} empresas. Remova os vínculos primeiro.`,
        variant: "destructive",
      });
      return;
    }

    const updatedModels = models.filter((m) => m.id !== id);
    setModels(updatedModels);
    localStorage.setItem("masterModels", JSON.stringify(updatedModels));
    
    toast({
      title: "✓ Modelo excluído",
      description: "O modelo foi excluído com sucesso.",
    });
  };

  const handleDuplicate = (id: string) => {
    const model = models.find((m) => m.id === id);
    if (model) {
      const duplicate: MasterModel = {
        ...model,
        id: String(models.length + 1).padStart(3, "0"),
        name: `${model.name} (Cópia)`,
        status: "inactive",
        companies_using: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updatedModels = [duplicate, ...models];
      setModels(updatedModels);
      localStorage.setItem("masterModels", JSON.stringify(updatedModels));
      
      toast({
        title: "✓ Modelo duplicado",
        description: `Cópia criada: "${duplicate.name}"`,
      });
    }
  };

  const handleEditModel = (data: any) => {
    if (!selectedModel) return;
    
    const updatedModels = models.map((m) =>
      m.id === selectedModel.id
        ? {
            ...m,
            name: data.name,
            description: data.description,
            status: data.status,
            total_criteria: data.total_criteria,
            criteria_by_senso: data.criteria_by_senso,
            criteria_ids: data.criteria_ids,
            updated_at: new Date().toISOString(),
          }
        : m
    );
    
    setModels(updatedModels);
    localStorage.setItem("masterModels", JSON.stringify(updatedModels));
    
    toast({
      title: "✓ Modelo atualizado",
      description: `O modelo "${data.name}" foi atualizado com sucesso.`,
    });
    
    setEditOpen(false);
    setSelectedModel(null);
  };

  const handleLinkCompanies = (modelId: string, companyIds: string[]) => {
    const updatedModels = models.map((m) =>
      m.id === modelId
        ? { ...m, companies_using: companyIds.length }
        : m
    );
    
    setModels(updatedModels);
    localStorage.setItem("masterModels", JSON.stringify(updatedModels));
    
    toast({
      title: "✓ Empresas vinculadas",
      description: `${companyIds.length} empresa(s) vinculada(s) ao modelo com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
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
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Modelos Mestre de Avaliação
          </h1>
          <p className="text-muted-foreground">
            Crie templates de avaliação 5S para suas empresas clientes
          </p>
        </div>

        {/* Stats Cards */}
        <ModelStatsCards models={models} />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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

        {/* Models Grid */}
        {filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
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
