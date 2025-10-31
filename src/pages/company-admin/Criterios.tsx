import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardList,
  BookOpen,
  Sparkles,
  CheckCircle,
  Search,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";
import { InlineWeightEditor } from "@/components/company-admin/criterios/InlineWeightEditor";
import { NewCriterionModal } from "@/components/company-admin/criterios/NewCriterionModal";
import { ViewCriterionModal } from "@/components/company-admin/criterios/ViewCriterionModal";
import { BulkActionsBar } from "@/components/company-admin/criterios/BulkActionsBar";
import { InheritedModelCard } from "@/components/company-admin/criterios/InheritedModelCard";
import { Criterion, CriterionSenso, CriterionScoringType, CriterionOrigin, CriterionStatus } from "@/types/criterion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const sensoColors = {
  '1S': 'bg-red-500',
  '2S': 'bg-orange-500',
  '3S': 'bg-yellow-500',
  '4S': 'bg-green-500',
  '5S': 'bg-blue-500',
};

export default function Criterios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sensoFilter, setSensoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);

  // Buscar company_id do usuário
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setCompanyId(data.company_id);
      }
    };

    fetchCompanyId();
  }, [user]);

  const fetchCriteria = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_criteria')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      // Mapear dados do Supabase para o tipo Criterion
      const mappedCriteria: Criterion[] = (data || []).map(item => ({
        id: item.id,
        company_id: item.company_id,
        master_criterion_id: item.master_criterion_id,
        name: item.name,
        description: item.description || '',
        senso: item.senso as CriterionSenso,
        scoring_type: item.scoring_type as CriterionScoringType,
        default_weight: item.default_weight,
        custom_weight: item.custom_weight,
        origin: item.origin as CriterionOrigin,
        origin_model_id: item.origin_model_id,
        origin_model_name: item.origin_model_name,
        status: item.status as CriterionStatus,
        tags: item.tags || [],
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        audits_using: 0, // TODO: buscar de tabela de auditorias quando implementada
        can_edit_content: item.origin === 'custom',
        can_edit_weight: true,
        can_delete: item.origin === 'custom',
        is_weight_customized: item.custom_weight !== item.default_weight
      }));

      setCriteria(mappedCriteria);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar critérios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, [companyId]);

  // Filtrar por tab
  let tabFilteredCriteria = criteria;
  if (activeTab === "inherited") {
    tabFilteredCriteria = criteria.filter(c => c.origin === 'ifa');
  } else if (activeTab === "custom") {
    tabFilteredCriteria = criteria.filter(c => c.origin === 'custom');
  }

  // Agrupar critérios herdados por modelo
  const groupedByModel = tabFilteredCriteria.reduce((acc, criterion) => {
    if (criterion.origin === 'ifa' && criterion.origin_model_id) {
      const modelKey = criterion.origin_model_id;
      if (!acc[modelKey]) {
        acc[modelKey] = {
          modelId: criterion.origin_model_id,
          modelName: criterion.origin_model_name || 'Modelo sem nome',
          criteria: []
        };
      }
      acc[modelKey].criteria.push(criterion);
    }
    return acc;
  }, {} as Record<string, { modelId: string; modelName: string; criteria: Criterion[] }>);

  const modelGroups = Object.values(groupedByModel);

  // Aplicar filtros
  const filteredCriteria = tabFilteredCriteria.filter((criterion) => {
    const matchesSearch = criterion.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSenso = sensoFilter === "all" || criterion.senso === sensoFilter;
    const matchesStatus = statusFilter === "all" || criterion.status === statusFilter;
    const matchesOrigin = originFilter === "all" || criterion.origin === originFilter;
    return matchesSearch && matchesSenso && matchesStatus && matchesOrigin;
  });

  // Stats
  const totalCriteria = criteria.length;
  const inheritedCount = criteria.filter(c => c.origin === 'ifa').length;
  const customCount = criteria.filter(c => c.origin === 'custom').length;
  const activeCount = criteria.filter(c => c.status === 'active').length;

  const handleWeightSave = async (criterionId: string, newWeight: number) => {
    try {
      const { error } = await supabase
        .from('company_criteria')
        .update({ custom_weight: newWeight })
        .eq('id', criterionId);

      if (error) throw error;

      await fetchCriteria();

      toast({
        title: "Peso atualizado",
        description: "O peso do critério foi atualizado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar peso",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedCriteria.length === filteredCriteria.length) {
      setSelectedCriteria([]);
    } else {
      setSelectedCriteria(filteredCriteria.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCriteria(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/admin-empresa" },
    { label: "Critérios", href: "/admin-empresa/criterios" },
  ];

  return (
    <CompanyAdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Critérios de Avaliação 5S</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Gerencie critérios herdados do IFA e crie critérios personalizados
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-card border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Critérios</p>
                <p className="text-3xl font-bold mt-2 text-foreground">{totalCriteria}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Herdados do IFA</p>
                <p className="text-3xl font-bold mt-2 text-foreground">{inheritedCount}</p>
                <Badge className="mt-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0">IFA</Badge>
                <p className="text-xs text-muted-foreground mt-1">Dos modelos vinculados</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personalizados</p>
                <p className="text-3xl font-bold mt-2 text-foreground">{customCount}</p>
                <Badge className="mt-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-0">Seu</Badge>
                <p className="text-xs text-muted-foreground mt-1">Criados por você</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-green-200 dark:border-green-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critérios Ativos</p>
                <p className="text-3xl font-bold mt-2 text-foreground">{activeCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Disponíveis para auditoria</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Todos</span><span className="sm:hidden">Todos</span> ({totalCriteria})
            </TabsTrigger>
            <TabsTrigger value="inherited" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Herdados</span><span className="sm:hidden">Herdados</span> ({inheritedCount})
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Personalizados</span><span className="sm:hidden">Personalizados</span> ({customCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {/* Barra de Ações */}
            {activeTab !== "inherited" && (
              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar critérios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={sensoFilter} onValueChange={setSensoFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Senso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="1S">1S</SelectItem>
                      <SelectItem value="2S">2S</SelectItem>
                      <SelectItem value="3S">3S</SelectItem>
                      <SelectItem value="4S">4S</SelectItem>
                      <SelectItem value="5S">5S</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ifa">IFA</SelectItem>
                      <SelectItem value="custom">Personalizados</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setNewModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Novo Critério</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Cards de Modelos Herdados */}
            {activeTab === "inherited" && (
              <div>
                {loading && (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando modelos...</p>
                  </div>
                )}
                {!loading && modelGroups.length === 0 && (
                  <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">Nenhum modelo herdado encontrado</p>
                  </div>
                )}
                {!loading && modelGroups.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modelGroups.map((group) => (
                      <InheritedModelCard
                        key={group.modelId}
                        modelId={group.modelId}
                        modelName={group.modelName}
                        criteria={group.criteria}
                        onViewCriterion={(criterion) => {
                          setSelectedCriterion(criterion);
                          setViewModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabela - apenas para abas 'all' e 'custom' */}
            {activeTab !== "inherited" && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCriteria.length === filteredCriteria.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">Nome</TableHead>
                    <TableHead className="min-w-[80px]">Senso</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[120px]">Tipo</TableHead>
                    <TableHead className="min-w-[100px]">Peso</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[150px]">Origem</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[80px]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[100px]">Em Uso</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Carregando critérios...</p>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredCriteria.map((criterion) => (
                    <TableRow
                      key={criterion.id}
                      className={`${
                        criterion.origin === 'ifa' ? 'border-l-4 border-l-blue-200' : 'border-l-4 border-l-purple-200'
                      }`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCriteria.includes(criterion.id)}
                          onCheckedChange={() => handleToggleSelect(criterion.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{criterion.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${sensoColors[criterion.senso]} text-white text-xs`}>
                          {criterion.senso}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{criterion.scoring_type}</span>
                      </TableCell>
                      <TableCell>
                        {criterion.origin === 'ifa' ? (
                          <InlineWeightEditor
                            criterionId={criterion.id}
                            defaultWeight={criterion.default_weight}
                            currentWeight={criterion.custom_weight}
                            onSave={handleWeightSave}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(criterion.custom_weight / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{criterion.custom_weight}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {criterion.origin === 'ifa' ? (
                          <div>
                            <Badge className="bg-blue-100 text-blue-700 mb-1 text-xs">IFA</Badge>
                            <p className="text-xs text-muted-foreground">{criterion.origin_model_name}</p>
                          </div>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">Personalizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {criterion.status === 'active' ? (
                          <Badge className="bg-emerald-500 text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">{criterion.audits_using} auditorias</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedCriterion(criterion);
                              setViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}

            {!loading && filteredCriteria.length === 0 && activeTab !== "inherited" && (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground">Nenhum critério encontrado</p>
                {activeTab === "custom" && (
                  <Button 
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setNewModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Critério Personalizado
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewCriterionModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={fetchCriteria}
        companyId={companyId || ''}
      />

      <ViewCriterionModal
        criterion={selectedCriterion}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      <BulkActionsBar
        selectedIds={selectedCriteria}
        criteria={criteria}
        onSuccess={fetchCriteria}
        onClearSelection={() => setSelectedCriteria([])}
      />
    </CompanyAdminLayout>
  );
}
