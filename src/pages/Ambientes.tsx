import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Factory, MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EnvironmentCard } from "@/components/company-admin/environments/EnvironmentCard";
import { CompanyCard } from "@/components/company-admin/environments/CompanyCard";
import { NewEnvironmentModal } from "@/components/company-admin/environments/NewEnvironmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import type { Environment } from "@/types/environment";

export default function Ambientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [newLocationParentId, setNewLocationParentId] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all companies (IFA Admin has access to all)
  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  // Fetch environments when company is selected
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEnvironments();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error("Error fetching companies:", error);
        toast({
          title: "Erro ao carregar empresas",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setCompanies(data || []);
      // Auto-select first company if available
      if (data && data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchEnvironments = async () => {
    if (!selectedCompanyId) return;
    
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('name');

      if (error) {
        console.error("Error fetching environments:", error);
        toast({
          title: "Erro ao carregar ambientes",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      const mappedEnvironments: Environment[] = (data || []).map(env => ({
        ...env,
        status: env.status as 'active' | 'inactive',
        icon: 'Factory',
        audits_count: 0
      }));
      
      setEnvironments(mappedEnvironments);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvironments = environments.filter(env => {
    const matchesSearch = env.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || env.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Hierarquia de 3 níveis
  const company = environments.find(env => env.parent_id === null); // Nível 0 - Empresa
  const environmentsList = filteredEnvironments.filter(env => env.parent_id === company?.id); // Nível 1 - Ambientes
  const locationsList = filteredEnvironments.filter(env => {
    const parent = environments.find(e => e.id === env.parent_id);
    return parent && parent.parent_id === company?.id;
  }); // Nível 2 - Locais

  const totalEnvironments = environmentsList.length;
  const totalLocations = locationsList.length;
  const activeEnvironments = environmentsList.filter(env => env.status === "active").length;
  const activeLocations = locationsList.filter(env => env.status === "active").length;

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            Ambientes e Locais
          </span>
        </nav>

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Ambientes e Locais</h1>
          <p className="text-muted-foreground">
            Gerencie ambientes e locais de todas as empresas do sistema
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Factory className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Ambientes</p>
                  <p className="text-2xl font-bold">{totalEnvironments}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeEnvironments} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Locais</p>
                  <p className="text-2xl font-bold">{totalLocations}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeLocations} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Selector - MANDATORY for IFA Admin */}
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input 
            placeholder="Buscar ambientes..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="flex-1"
            disabled={!selectedCompanyId}
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        {/* Company Selection Required Message */}
        {!selectedCompanyId && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione uma empresa</h3>
              <p className="text-muted-foreground">
                Escolha uma empresa acima para gerenciar seus ambientes e locais
              </p>
            </CardContent>
          </Card>
        )}

        {/* Environments Hierarchy */}
        {selectedCompanyId && (
          <div className="space-y-2">
            {/* Company Card (nível 0) */}
            {company && (
              <CompanyCard 
                company={company} 
                totalEnvironments={totalEnvironments} 
                totalLocations={totalLocations} 
                onAddEnvironment={() => setIsNewModalOpen(true)}
                isExpanded={allExpanded}
                onToggleExpand={() => setAllExpanded(!allExpanded)}
              />
            )}

            {/* Ambientes (nível 1) e seus Locais (nível 2) */}
            {allExpanded && environmentsList.map(env => (
              <EnvironmentCard 
                key={env.id} 
                environment={env}
                locations={locationsList.filter(loc => loc.parent_id === env.id)}
                onEdit={environment => {
                  setEditingEnvironment(environment);
                  setIsNewModalOpen(true);
                }}
                onAddLocation={parentId => {
                  setNewLocationParentId(parentId);
                  setIsNewModalOpen(true);
                }}
                onRefresh={fetchEnvironments}
              />
            ))}

            {environmentsList.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum ambiente encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece criando ambientes para organizar os locais de {selectedCompany?.name}
                  </p>
                  <Button 
                    onClick={() => setIsNewModalOpen(true)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Ambiente
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <NewEnvironmentModal
        open={isNewModalOpen}
        onOpenChange={open => {
          setIsNewModalOpen(open);
          if (!open) {
            setEditingEnvironment(null);
            setNewLocationParentId(null);
          }
        }}
        onSuccess={fetchEnvironments}
        editingEnvironment={editingEnvironment}
        parentId={newLocationParentId}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
