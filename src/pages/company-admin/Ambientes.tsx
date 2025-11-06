import { useState, useEffect } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, CheckCircle, Factory, MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EnvironmentCard } from "@/components/company-admin/environments/EnvironmentCard";
import { CompanyCard } from "@/components/company-admin/environments/CompanyCard";
import { NewEnvironmentModal } from "@/components/company-admin/environments/NewEnvironmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Environment } from "@/types/environment";

export default function Ambientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [newLocationParentId, setNewLocationParentId] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch environments from Supabase
  useEffect(() => {
    if (user) {
      fetchEnvironments();
    }
  }, [user]);

  const fetchEnvironments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's company ID
      const { data: companyIdData } = await supabase.rpc('get_user_company_id', { _user_id: user.id });
      
      if (!companyIdData) {
        toast({
          title: "Empresa não encontrada",
          description: "Sua conta não está vinculada a uma empresa.",
          variant: "destructive",
        });
        return;
      }

      // Fetch environments for this company
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', companyIdData as string)
        .order('name');

      if (error) {
        console.error("Error fetching environments:", error);
        toast({
          title: "Erro ao carregar ambientes",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Map database rows to Environment type
      const mappedEnvironments: Environment[] = (data || []).map(env => ({
        ...env,
        status: env.status as 'active' | 'inactive',
        icon: 'Factory', // Default icon
        audits_count: 0,
      }));

      setEnvironments(mappedEnvironments);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvironments = environments.filter((env) => {
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
  const activeEnvironments = environmentsList.filter((env) => env.status === "active").length;
  const activeLocations = locationsList.filter((env) => env.status === "active").length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Ambientes" }]}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Ambientes e Locais</h1>
          <p className="text-muted-foreground mt-1">
            Organize os ambientes e locais da sua empresa para auditorias 5S
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Factory className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Ambientes</p>
                  <p className="text-3xl font-bold">{totalEnvironments}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeEnvironments} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Locais</p>
                  <p className="text-3xl font-bold">{totalLocations}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeLocations} ativos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar ambientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
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
          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Ambiente
          </Button>
        </div>

        {/* Environments Hierarchy */}
        <div className="space-y-4">
          {/* Company Card (nível 0) */}
          {company && (
            <CompanyCard
              company={company}
              totalEnvironments={totalEnvironments}
              totalLocations={totalLocations}
              onAddEnvironment={() => setIsNewModalOpen(true)}
            />
          )}

          {/* Ambientes (nível 1) e seus Locais (nível 2) */}
          {environmentsList.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              locations={locationsList.filter(
                (loc) => loc.parent_id === env.id
              )}
              onEdit={(environment) => {
                setEditingEnvironment(environment);
                setIsNewModalOpen(true);
              }}
              onAddLocation={(parentId) => {
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
                  Comece criando ambientes para organizar os locais da sua empresa
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
      </div>

      <NewEnvironmentModal 
        open={isNewModalOpen} 
        onOpenChange={(open) => {
          setIsNewModalOpen(open);
          if (!open) {
            setEditingEnvironment(null);
            setNewLocationParentId(null);
          }
        }}
        onSuccess={fetchEnvironments}
        editingEnvironment={editingEnvironment}
        parentId={newLocationParentId}
        companyId={company?.id}
      />
    </CompanyAdminLayout>
  );
}
