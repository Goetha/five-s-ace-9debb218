import { useState } from "react";
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
  Pencil,
  MoreVertical,
} from "lucide-react";
import { allCriteria, mockInheritedCriteria, mockCustomCriteria } from "@/data/mockCriterions";
import { InlineWeightEditor } from "@/components/company-admin/criterios/InlineWeightEditor";
import { Criterion } from "@/types/criterion";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sensoColors = {
  '1S': 'bg-red-500',
  '2S': 'bg-orange-500',
  '3S': 'bg-yellow-500',
  '4S': 'bg-green-500',
  '5S': 'bg-blue-500',
};

export default function Criterios() {
  const [criteria, setCriteria] = useState(allCriteria);
  const [searchTerm, setSearchTerm] = useState("");
  const [sensoFilter, setSensoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [originFilter, setOriginFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const { toast } = useToast();

  // Filtrar por tab
  let tabFilteredCriteria = criteria;
  if (activeTab === "inherited") {
    tabFilteredCriteria = mockInheritedCriteria;
  } else if (activeTab === "custom") {
    tabFilteredCriteria = mockCustomCriteria;
  }

  // Aplicar filtros
  const filteredCriteria = tabFilteredCriteria.filter((criterion) => {
    const matchesSearch = criterion.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSenso = sensoFilter === "all" || criterion.senso === sensoFilter;
    const matchesStatus = statusFilter === "all" || criterion.status === statusFilter;
    const matchesOrigin = originFilter === "all" || criterion.origin === originFilter;
    return matchesSearch && matchesSenso && matchesStatus && matchesOrigin;
  });

  // Stats
  const totalCriteria = allCriteria.length;
  const inheritedCount = mockInheritedCriteria.length;
  const customCount = mockCustomCriteria.length;
  const activeCount = allCriteria.filter(c => c.status === 'active').length;

  const handleWeightSave = async (criterionId: string, newWeight: number) => {
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 500));
    setCriteria(prev =>
      prev.map(c =>
        c.id === criterionId
          ? { ...c, custom_weight: newWeight, is_weight_customized: newWeight !== c.default_weight }
          : c
      )
    );
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Critérios de Avaliação 5S</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie critérios herdados do IFA e crie critérios personalizados
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-emerald-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Critérios</p>
                <p className="text-3xl font-bold mt-2">{totalCriteria}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-emerald-600" />
            </div>
          </Card>

          <Card className="p-6 bg-blue-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Herdados do IFA</p>
                <p className="text-3xl font-bold mt-2">{inheritedCount}</p>
                <Badge className="mt-2 bg-blue-100 text-blue-700">📚 IFA</Badge>
                <p className="text-xs text-muted-foreground mt-1">Dos modelos vinculados</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 bg-purple-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personalizados</p>
                <p className="text-3xl font-bold mt-2">{customCount}</p>
                <Badge className="mt-2 bg-purple-100 text-purple-700">✨ Seu</Badge>
                <p className="text-xs text-muted-foreground mt-1">Criados por você</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6 bg-green-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critérios Ativos</p>
                <p className="text-3xl font-bold mt-2">{activeCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Disponíveis para auditoria</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">📊 Todos ({totalCriteria})</TabsTrigger>
            <TabsTrigger value="inherited">📚 Herdados ({inheritedCount})</TabsTrigger>
            <TabsTrigger value="custom">✨ Personalizados ({customCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {/* Barra de Ações */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar critérios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={sensoFilter} onValueChange={setSensoFilter}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ifa">IFA</SelectItem>
                  <SelectItem value="custom">Personalizados</SelectItem>
                </SelectContent>
              </Select>

              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Critério
              </Button>
            </div>

            {/* Tabela */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCriteria.length === filteredCriteria.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Senso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Em Uso</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCriteria.map((criterion) => (
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
                        <Badge className={`${sensoColors[criterion.senso]} text-white`}>
                          {criterion.senso}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        {criterion.origin === 'ifa' ? (
                          <div>
                            <Badge className="bg-blue-100 text-blue-700 mb-1">📚 IFA</Badge>
                            <p className="text-xs text-muted-foreground">{criterion.origin_model_name}</p>
                          </div>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-700">✨ Personalizado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {criterion.status === 'active' ? (
                          <Badge className="bg-emerald-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{criterion.audits_using} auditorias</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {criterion.can_edit_content && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {criterion.origin === 'ifa' ? (
                                <>
                                  <DropdownMenuItem>📊 Ver Origem</DropdownMenuItem>
                                  <DropdownMenuItem>⟲ Restaurar Peso</DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem>📋 Duplicar</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredCriteria.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum critério encontrado</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CompanyAdminLayout>
  );
}
