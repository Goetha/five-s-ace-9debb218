import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, X, CheckCircle2, Pencil, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  senso: string[] | null;
  scoring_type: string;
  isGlobal?: boolean;
  companyCriterionId?: string; // ID do company_criteria se for cópia de master
}

interface ManageCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  localId: string;
  localName: string;
  companyId: string;
  onUpdate: () => void;
}

const SENSO_OPTIONS = ['1S', '2S', '3S', '4S', '5S'];

const getSensoColor = (senso: string) => {
  const sensoColors: Record<string, string> = {
    '1S': 'bg-red-500',
    '2S': 'bg-orange-500',
    '3S': 'bg-yellow-500',
    '4S': 'bg-emerald-500',
    '5S': 'bg-blue-500',
  };
  return sensoColors[senso] || 'bg-gray-500';
};

export function ManageCriteriaModal({
  isOpen,
  onClose,
  localId,
  localName,
  companyId,
  onUpdate
}: ManageCriteriaModalProps) {
  const [allCriteria, setAllCriteria] = useState<Criterion[]>([]);
  const [linkedCriteriaIds, setLinkedCriteriaIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para o dialog de criar critério
  const [showNewCriterionDialog, setShowNewCriterionDialog] = useState(false);
  
  // Estado para o dialog de editar critério
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, localId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar critérios da empresa E critérios globais (master_criteria)
      const [companyResult, masterResult, linkedResult] = await Promise.all([
        supabase
          .from('company_criteria')
          .select('id, name, description, senso, scoring_type, master_criterion_id')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('master_criteria')
          .select('id, name, description, senso, scoring_type')
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('environment_criteria')
          .select('criterion_id')
          .eq('environment_id', localId)
      ]);

      if (companyResult.error) throw companyResult.error;
      if (masterResult.error) throw masterResult.error;
      if (linkedResult.error) throw linkedResult.error;

      const companyCriteriaData = companyResult.data || [];
      const linkedIds = new Set(linkedResult.data?.map(l => l.criterion_id) || []);
      
      // Criar mapa de master_criterion_id -> company_criteria para os que já foram copiados
      const masterToCompanyMap = new Map<string, { id: string; name: string; description: string | null; senso: string[] | null }>();
      companyCriteriaData.forEach(c => {
        if (c.master_criterion_id) {
          masterToCompanyMap.set(c.master_criterion_id, {
            id: c.id,
            name: c.name,
            description: c.description,
            senso: c.senso
          });
        }
      });

      // Filtrar critérios da empresa que NÃO são cópias de master (origin != 'master')
      // ou são cópias mas queremos mostrar apenas o original
      const companyCriteriaToShow = companyCriteriaData
        .filter(c => !c.master_criterion_id) // Não mostrar cópias de master
        .map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          senso: c.senso,
          scoring_type: c.scoring_type,
          isGlobal: false
        }));

      // Marcar critérios globais com os dados da cópia se existir
      const masterCriteria = (masterResult.data || []).map(c => {
        const companyCopy = masterToCompanyMap.get(c.id);
        return {
          id: c.id,
          // Se existe cópia personalizada, usar nome/descrição da cópia
          name: companyCopy?.name || c.name,
          description: companyCopy?.description || c.description,
          senso: companyCopy?.senso || c.senso,
          scoring_type: c.scoring_type,
          isGlobal: true,
          companyCriterionId: companyCopy?.id
        };
      });

      // Combinar: globais primeiro, depois os da empresa
      const allCriteriaData = [...masterCriteria, ...companyCriteriaToShow];

      // Para linkedCriteriaIds, precisamos mapear os company_criteria vinculados de volta para master_criteria IDs
      const finalLinkedIds = new Set<string>();
      
      linkedIds.forEach(companyId => {
        // Verificar se esse company_criteria é uma cópia de master
        const companyCriterion = companyCriteriaData.find(c => c.id === companyId);
        if (companyCriterion?.master_criterion_id) {
          // É uma cópia de master, marcar o ID do master como selecionado
          finalLinkedIds.add(companyCriterion.master_criterion_id);
        } else {
          // É um critério da empresa, manter o ID original
          finalLinkedIds.add(companyId);
        }
      });

      setAllCriteria(allCriteriaData);
      setLinkedCriteriaIds(finalLinkedIds);
    } catch (error) {
      console.error('Error fetching criteria:', error);
      toast.error('Erro ao carregar critérios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCriterion = (criterionId: string) => {
    setLinkedCriteriaIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criterionId)) {
        newSet.delete(criterionId);
      } else {
        newSet.add(criterionId);
      }
      return newSet;
    });
  };

  const handleCriterionCreated = (newCriterion: Criterion) => {
    setAllCriteria(prev => [...prev, newCriterion].sort((a, b) => a.name.localeCompare(b.name)));
    setLinkedCriteriaIds(prev => new Set([...prev, newCriterion.id]));
    setShowNewCriterionDialog(false);
  };

  const handleEditCriterion = (criterion: Criterion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCriterion(criterion);
    setShowEditDialog(true);
  };

  const handleCriterionUpdated = (updatedCriterion: Criterion) => {
    setAllCriteria(prev => 
      prev.map(c => c.id === updatedCriterion.id ? { ...c, ...updatedCriterion } : c)
    );
    setShowEditDialog(false);
    setEditingCriterion(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Buscar critérios vinculados atualmente
      const { data: currentLinked, error: fetchError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', localId);

      if (fetchError) throw fetchError;

      const currentIds = new Set(currentLinked?.map(l => l.criterion_id) || []);
      
      // Separar os IDs selecionados em globais e da empresa
      const selectedGlobalIds: string[] = [];
      const selectedCompanyIds: string[] = [];
      
      linkedCriteriaIds.forEach(id => {
        const criterion = allCriteria.find(c => c.id === id);
        if (criterion?.isGlobal) {
          selectedGlobalIds.push(id);
        } else {
          selectedCompanyIds.push(id);
        }
      });

      // Para critérios globais, precisamos criar cópias em company_criteria primeiro
      const globalToCompanyMap = new Map<string, string>();
      
      if (selectedGlobalIds.length > 0) {
        // Verificar quais globais já existem como company_criteria
        const { data: existingCopies } = await supabase
          .from('company_criteria')
          .select('id, master_criterion_id')
          .eq('company_id', companyId)
          .in('master_criterion_id', selectedGlobalIds);

        const existingMap = new Map(
          (existingCopies || []).map(c => [c.master_criterion_id, c.id])
        );

        // Criar cópias dos critérios globais que ainda não existem
        const toCreateFromGlobal = selectedGlobalIds.filter(id => !existingMap.has(id));
        
        if (toCreateFromGlobal.length > 0) {
          const globalCriteria = allCriteria.filter(c => toCreateFromGlobal.includes(c.id));
          
          const newCompanyCriteria = globalCriteria.map(gc => ({
            company_id: companyId,
            master_criterion_id: gc.id,
            name: gc.name,
            description: gc.description,
            senso: gc.senso,
            scoring_type: gc.scoring_type,
            origin: 'master',
            status: 'active'
          }));

          const { data: created, error: createError } = await supabase
            .from('company_criteria')
            .insert(newCompanyCriteria)
            .select('id, master_criterion_id');

          if (createError) throw createError;

          // Mapear os IDs criados
          (created || []).forEach(c => {
            if (c.master_criterion_id) {
              globalToCompanyMap.set(c.master_criterion_id, c.id);
            }
          });
        }

        // Adicionar os IDs existentes ao mapa
        existingMap.forEach((companyId, masterId) => {
          globalToCompanyMap.set(masterId, companyId);
        });
      }

      // Converter IDs globais para IDs de company_criteria
      const finalSelectedIds = new Set([
        ...selectedCompanyIds,
        ...selectedGlobalIds.map(gId => globalToCompanyMap.get(gId) || gId)
      ]);

      const toAdd = [...finalSelectedIds].filter(id => !currentIds.has(id));
      const toRemove = [...currentIds].filter(id => !finalSelectedIds.has(id));

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('environment_criteria')
          .insert(
            toAdd.map(criterionId => ({
              environment_id: localId,
              criterion_id: criterionId
            }))
          );

        if (insertError) throw insertError;
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('environment_criteria')
          .delete()
          .eq('environment_id', localId)
          .in('criterion_id', toRemove);

        if (deleteError) throw deleteError;
      }

      toast.success('Critérios atualizados com sucesso');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving criteria:', error);
      toast.error('Erro ao salvar critérios');
    } finally {
      setSaving(false);
    }
  };

  const filteredCriteria = allCriteria.filter(criterion =>
    criterion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (criterion.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedCount = linkedCriteriaIds.size;
  const totalCount = allCriteria.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] w-[95vw] sm:w-full flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b bg-muted/30">
            <DialogTitle className="text-base sm:text-lg font-semibold">
              Critérios do Local: <span className="text-primary">{localName}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="px-4 sm:px-5 py-3 border-b bg-background">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar critério..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm('')}
                    className="h-9 w-9 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Criteria List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredCriteria.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">
                    {searchTerm ? 'Nenhum critério encontrado' : 'Nenhum critério disponível'}
                  </p>
                  {!searchTerm && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewCriterionDialog(true)}
                      className="mt-2 text-primary"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Criar primeiro critério
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCriteria.map((criterion) => {
                    const isSelected = linkedCriteriaIds.has(criterion.id);
                    return (
                      <div
                        key={criterion.id}
                        onClick={() => handleToggleCriterion(criterion.id)}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'bg-primary/5 border-primary/30 shadow-sm' 
                            : 'bg-card hover:bg-accent/50 border-border'
                          }
                        `}
                      >
                        <div className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleCriterion(criterion.id)}
                            className={isSelected ? 'border-primary data-[state=checked]:bg-primary' : ''}
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className={`text-sm leading-tight ${isSelected ? 'font-medium' : ''}`}>
                                {criterion.name}
                              </p>
                              {criterion.isGlobal && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                                  Global
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-primary/10"
                                  onClick={(e) => handleEditCriterion(criterion, e)}
                                  title="Editar critério"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              )}
                              {criterion.senso && criterion.senso.length > 0 && (
                                <div className="flex gap-1">
                                  {criterion.senso.map((s) => (
                                    <span
                                      key={s}
                                      className={`${getSensoColor(s)} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {criterion.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {criterion.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Counter */}
            <div className="px-4 sm:px-5 py-2 border-t bg-muted/30">
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedCount}</span> de {totalCount} selecionados
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-5 py-3 border-t bg-muted/30 space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCriterionDialog(true)}
              className="w-full justify-center text-primary border-dashed hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Critério
            </Button>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={saving} 
                className="w-full sm:w-auto sm:flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || loading} 
                className="w-full sm:w-auto sm:flex-1"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal separado para criar critério */}
      <NewCriterionDialog
        isOpen={showNewCriterionDialog}
        onClose={() => setShowNewCriterionDialog(false)}
        companyId={companyId}
        onCreated={handleCriterionCreated}
      />

      {/* Modal separado para editar critério */}
      <EditCriterionDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingCriterion(null);
        }}
        criterion={editingCriterion}
        companyId={companyId}
        localName={localName}
        onUpdated={handleCriterionUpdated}
      />
    </>
  );
}

// Dialog separado para criar novo critério
interface NewCriterionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onCreated: (criterion: Criterion) => void;
}

function NewCriterionDialog({ isOpen, onClose, companyId, onCreated }: NewCriterionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [senso, setSenso] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSenso([]);
    }
  }, [isOpen]);

  const handleToggleSenso = (s: string) => {
    setSenso(prev => {
      if (prev.includes(s)) {
        return prev.filter(x => x !== s);
      } else {
        return [...prev, s].sort();
      }
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Digite o nome do critério');
      return;
    }

    setSaving(true);
    try {
      // Check if offline
      const isOffline = !navigator.onLine;
      
      if (isOffline) {
        // OFFLINE MODE: Save locally
        const { createOfflineCriterion } = await import('@/lib/offlineStorage');
        
        const offlineCriterion = await createOfflineCriterion({
          company_id: companyId,
          name: name.trim(),
          description: description.trim() || null,
          senso: senso.length > 0 ? senso : null,
          scoring_type: 'conform-non-conform',
          origin: 'custom',
          status: 'active',
          tags: null,
        });

        toast.success('Critério salvo localmente!', {
          description: 'Será sincronizado quando você voltar online.'
        });
        
        onCreated({
          id: offlineCriterion.id,
          name: offlineCriterion.name,
          description: offlineCriterion.description,
          senso: offlineCriterion.senso,
          scoring_type: offlineCriterion.scoring_type,
        });
        return;
      }

      // ONLINE MODE: Save to Supabase
      const { data: newCriterion, error } = await supabase
        .from('company_criteria')
        .insert({
          company_id: companyId,
          name: name.trim(),
          description: description.trim() || null,
          senso: senso.length > 0 ? senso : null,
          origin: 'custom',
          scoring_type: 'conform-non-conform',
          status: 'active'
        })
        .select('id, name, description, senso, scoring_type')
        .single();

      if (error) throw error;

      toast.success('Critério criado e vinculado!');
      onCreated(newCriterion);
    } catch (error) {
      console.error('Error creating criterion:', error);
      toast.error('Erro ao criar critério');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Novo Critério
            {isOfflineMode && (
              <Badge variant="outline" className="text-amber-500 border-amber-500">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <Input
              placeholder="Digite o nome do critério"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descrição do critério (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Senso</label>
            <div className="flex flex-wrap gap-2">
              {SENSO_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleToggleSenso(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    senso.includes(s)
                      ? `${getSensoColor(s)} text-white`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar e Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog para editar critério
interface EditCriterionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  criterion: Criterion | null;
  companyId: string;
  localName: string;
  onUpdated: (criterion: Criterion) => void;
}

function EditCriterionDialog({ isOpen, onClose, criterion, companyId, localName, onUpdated }: EditCriterionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [senso, setSenso] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && criterion) {
      setName(criterion.name || '');
      setDescription(criterion.description || '');
      setSenso(criterion.senso || []);
    }
  }, [isOpen, criterion]);

  const handleToggleSenso = (s: string) => {
    setSenso(prev => {
      if (prev.includes(s)) {
        return prev.filter(x => x !== s);
      } else {
        return [...prev, s].sort();
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !criterion) {
      toast.error('Digite o nome do critério');
      return;
    }

    setSaving(true);
    try {
      // Se é um critério global, precisamos atualizar/criar a cópia em company_criteria
      if (criterion.isGlobal) {
        // Verificar se já existe uma cópia
        const { data: existingCopy } = await supabase
          .from('company_criteria')
          .select('id')
          .eq('company_id', companyId)
          .eq('master_criterion_id', criterion.id)
          .maybeSingle();

        if (existingCopy) {
          // Atualizar a cópia existente
          const { error } = await supabase
            .from('company_criteria')
            .update({
              name: name.trim(),
              description: description.trim() || null,
              senso: senso.length > 0 ? senso : null,
            })
            .eq('id', existingCopy.id);

          if (error) throw error;
        } else {
          // Criar uma nova cópia customizada
          const { error } = await supabase
            .from('company_criteria')
            .insert({
              company_id: companyId,
              master_criterion_id: criterion.id,
              name: name.trim(),
              description: description.trim() || null,
              senso: senso.length > 0 ? senso : null,
              origin: 'master',
              scoring_type: criterion.scoring_type || 'conform-non-conform',
              status: 'active'
            });

          if (error) throw error;
        }
      } else {
        // É um critério da empresa, atualizar diretamente
        const { error } = await supabase
          .from('company_criteria')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            senso: senso.length > 0 ? senso : null,
          })
          .eq('id', criterion.id);

        if (error) throw error;
      }

      toast.success(`Critério atualizado para ${localName}!`);
      onUpdated({
        ...criterion,
        name: name.trim(),
        description: description.trim() || null,
        senso: senso.length > 0 ? senso : null,
      });
    } catch (error) {
      console.error('Error updating criterion:', error);
      toast.error('Erro ao atualizar critério');
    } finally {
      setSaving(false);
    }
  };

  if (!criterion) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            Editar Critério
            {criterion.isGlobal && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                Global
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Alterações serão salvas apenas para <strong>{localName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <Input
              placeholder="Digite o nome do critério"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descrição do critério (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Senso</label>
            <div className="flex flex-wrap gap-2">
              {SENSO_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleToggleSenso(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    senso.includes(s)
                      ? `${getSensoColor(s)} text-white`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar para {localName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
