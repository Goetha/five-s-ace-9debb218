import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Loader2, WifiOff } from "lucide-react";
import { AuditorStatsCards } from "@/components/avaliadores/AuditorStatsCards";
import { AuditorCard } from "@/components/avaliadores/AuditorCard";
import { BulkActionsBar } from "@/components/avaliadores/BulkActionsBar";
import { DeleteAuditorsDialog } from "@/components/avaliadores/DeleteAuditorsDialog";
import { EditAuditorCompaniesModal } from "@/components/avaliadores/EditAuditorCompaniesModal";
import { ViewAuditorModal } from "@/components/avaliadores/ViewAuditorModal";
import { NewAuditorModal } from "@/components/avaliadores/NewAuditorModal";
import { Auditor } from "@/types/auditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { getCachedAuditors, cacheAuditors } from "@/lib/offlineStorage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Avaliadores = () => {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [filteredAuditors, setFilteredAuditors] = useState<Auditor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editCompaniesModalOpen, setEditCompaniesModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAuditors();
  }, []);

  useEffect(() => {
    filterAuditors();
  }, [auditors, searchTerm, statusFilter]);

  const loadAuditors = async () => {
    setLoading(true);
    setIsFromCache(false);
    
    try {
      // OFFLINE MODE: Fetch from cache
      if (!navigator.onLine) {
        console.log('📴 Loading auditors from cache...');
        const cached = await getCachedAuditors();
        if (cached.length > 0) {
          setAuditors(cached);
          setIsFromCache(true);
          setLoading(false);
          return;
        }
      }

      // ONLINE MODE: Fetch from edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('list-all-auditors');

      if (error) throw error;
      
      const auditorsList = data.auditors || [];
      setAuditors(auditorsList);
      setLastSyncAt(new Date().toISOString());
      
      // Cache for offline use
      if (auditorsList.length > 0) {
        await cacheAuditors(auditorsList);
      }
    } catch (error) {
      console.error('Error loading auditors:', error);
      
      // Fallback to cache on error
      try {
        console.log('📴 Falling back to auditors cache...');
        const cached = await getCachedAuditors();
        if (cached.length > 0) {
          setAuditors(cached);
          setIsFromCache(true);
        } else {
          toast({
            title: "Erro ao carregar avaliadores",
            description: "Não foi possível carregar a lista de avaliadores.",
            variant: "destructive",
          });
        }
      } catch (cacheError) {
        toast({
          title: "Erro ao carregar avaliadores",
          description: "Não foi possível carregar a lista de avaliadores.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAuditors = () => {
    let filtered = auditors;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    setFilteredAuditors(filtered);
  };

  const handleEditCompanies = (auditor: Auditor) => {
    setSelectedAuditor(auditor);
    setEditCompaniesModalOpen(true);
  };

  const handleViewDetails = (auditor: Auditor) => {
    setSelectedAuditor(auditor);
    setViewModalOpen(true);
  };

  const handleSuccess = () => {
    loadAuditors();
    setSelectedAuditorIds([]);
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedAuditorIds((prev) => [...prev, id]);
    } else {
      setSelectedAuditorIds((prev) => prev.filter((auditorId) => auditorId !== id));
    }
  };

  const handleClearSelection = () => {
    setSelectedAuditorIds([]);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-company-users', {
        body: { userIds: selectedAuditorIds },
      });

      if (error) throw error;

      toast({
        title: "Avaliadores excluídos",
        description: `${selectedAuditorIds.length} avaliador${selectedAuditorIds.length > 1 ? 'es' : ''} excluído${selectedAuditorIds.length > 1 ? 's' : ''} com sucesso.`,
      });

      setSelectedAuditorIds([]);
      setDeleteDialogOpen(false);
      loadAuditors();
    } catch (error) {
      console.error('Error deleting auditors:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir os avaliadores selecionados.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Offline Banner */}
        <OfflineBanner 
          isOffline={!navigator.onLine}
          isFromCache={isFromCache}
          lastSyncAt={lastSyncAt}
          onRefresh={loadAuditors}
          isRefreshing={loading}
        />

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Gestão de Avaliadores
            </h1>
            <p className="text-muted-foreground">
              Gerencie auditores e suas empresas vinculadas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFromCache && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
            <Button onClick={() => setNewModalOpen(true)} disabled={!navigator.onLine}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Avaliador
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <AuditorStatsCards auditors={auditors} />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedAuditorIds.length}
          onClearSelection={handleClearSelection}
          onDelete={handleDeleteClick}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auditors Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAuditors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Nenhum avaliador encontrado com os filtros aplicados"
                : "Nenhum avaliador cadastrado ainda"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button onClick={() => setNewModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Avaliador
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuditors.map((auditor) => (
              <AuditorCard
                key={auditor.id}
                auditor={auditor}
                selected={selectedAuditorIds.includes(auditor.id)}
                onSelect={handleSelect}
                onEditCompanies={handleEditCompanies}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <EditAuditorCompaniesModal
        auditor={selectedAuditor}
        open={editCompaniesModalOpen}
        onOpenChange={setEditCompaniesModalOpen}
        onSuccess={handleSuccess}
      />
      <ViewAuditorModal
        auditor={selectedAuditor}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />
      <NewAuditorModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={handleSuccess}
      />
      <DeleteAuditorsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        auditorCount={selectedAuditorIds.length}
      />
    </div>
  );
};

export default Avaliadores;
