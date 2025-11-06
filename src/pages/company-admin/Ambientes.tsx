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
import { Building2, CheckCircle, Folder, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EnvironmentCard } from "@/components/company-admin/environments/EnvironmentCard";
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
  const [newSubEnvironmentParentId, setNewSubEnvironmentParentId] = useState<string | null>(null);
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

  const parentEnvironments = filteredEnvironments.filter((env) => !env.parent_id);
  const totalEnvironments = environments.length;
  const activeEnvironments = environments.filter((env) => env.status === "active").length;
  const subEnvironments = environments.filter((env) => env.parent_id !== null).length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Ambientes" }]}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Ambientes e Setores</h1>
          <p className="text-muted-foreground mt-1">
            Organize as áreas da sua empresa para auditorias 5S
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Ambientes</p>
                  <p className="text-3xl font-bold">{totalEnvironments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-3xl font-bold">{activeEnvironments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/20 rounded-lg">
                  <Folder className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-ambientes</p>
                  <p className="text-3xl font-bold">{subEnvironments}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Organizados hierarquicamente
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
          {parentEnvironments.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              subEnvironments={filteredEnvironments.filter(
                (sub) => sub.parent_id === env.id
              )}
              onEdit={(environment) => {
                setEditingEnvironment(environment);
                setIsNewModalOpen(true);
              }}
              onAddSubEnvironment={(parentId) => {
                setNewSubEnvironmentParentId(parentId);
                setIsNewModalOpen(true);
              }}
              onRefresh={fetchEnvironments}
            />
          ))}

          {filteredEnvironments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum ambiente encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou crie um novo ambiente
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
            setNewSubEnvironmentParentId(null);
          }
        }}
        onSuccess={fetchEnvironments}
        editingEnvironment={editingEnvironment}
        parentId={newSubEnvironmentParentId}
      />
    </CompanyAdminLayout>
  );
}
