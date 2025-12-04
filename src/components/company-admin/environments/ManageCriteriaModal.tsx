import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  senso: string[] | null;
  scoring_type: string;
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

  // Estados para criação de critério
  const [isCreating, setIsCreating] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionDescription, setNewCriterionDescription] = useState('');
  const [newCriterionSenso, setNewCriterionSenso] = useState<string[]>([]);
  const [isCreatingSaving, setIsCreatingSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset form state when modal opens
      setIsCreating(false);
      setNewCriterionName('');
      setNewCriterionDescription('');
      setNewCriterionSenso([]);
    }
  }, [isOpen, localId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar todos os critérios ativos da empresa
      const { data: criteria, error: criteriaError } = await supabase
        .from('company_criteria')
        .select('id, name, description, senso, scoring_type')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (criteriaError) throw criteriaError;

      // Buscar critérios já vinculados ao Local
      const { data: linked, error: linkedError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', localId);

      if (linkedError) throw linkedError;

      setAllCriteria(criteria || []);
      setLinkedCriteriaIds(new Set(linked?.map(l => l.criterion_id) || []));
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

  const handleToggleSenso = (senso: string) => {
    setNewCriterionSenso(prev => {
      if (prev.includes(senso)) {
        return prev.filter(s => s !== senso);
      } else {
        return [...prev, senso].sort();
      }
    });
  };

  const handleCreateCriterion = async () => {
    if (!newCriterionName.trim()) {
      toast.error('Digite o nome do critério');
      return;
    }

    setIsCreatingSaving(true);
    try {
      // Criar o critério na tabela company_criteria
      const { data: newCriterion, error: createError } = await supabase
        .from('company_criteria')
        .insert({
          company_id: companyId,
          name: newCriterionName.trim(),
          description: newCriterionDescription.trim() || null,
          senso: newCriterionSenso.length > 0 ? newCriterionSenso : null,
          origin: 'custom',
          scoring_type: 'conform-non-conform',
          status: 'active'
        })
        .select('id, name, description, senso, scoring_type')
        .single();

      if (createError) throw createError;

      // Adicionar à lista de critérios
      setAllCriteria(prev => [...prev, newCriterion].sort((a, b) => a.name.localeCompare(b.name)));

      // Vincular automaticamente ao local
      setLinkedCriteriaIds(prev => new Set([...prev, newCriterion.id]));

      // Limpar formulário
      setNewCriterionName('');
      setNewCriterionDescription('');
      setNewCriterionSenso([]);
      setIsCreating(false);

      toast.success('Critério criado e vinculado!');
    } catch (error) {
      console.error('Error creating criterion:', error);
      toast.error('Erro ao criar critério');
    } finally {
      setIsCreatingSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Buscar estado atual do banco
      const { data: currentLinked, error: fetchError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', localId);

      if (fetchError) throw fetchError;

      const currentIds = new Set(currentLinked?.map(l => l.criterion_id) || []);
      const selectedIds = linkedCriteriaIds;

      // Identificar adições e remoções
      const toAdd = [...selectedIds].filter(id => !currentIds.has(id));
      const toRemove = [...currentIds].filter(id => !selectedIds.has(id));

      // Adicionar novos
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

      // Remover desmarcados
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

  const getSensoColor = (senso: string) => {
    const sensoColors: Record<string, string> = {
      '1S': 'bg-red-500',
      '2S': 'bg-orange-500',
      '3S': 'bg-yellow-500',
      '4S': 'bg-green-500',
      '5S': 'bg-blue-500',
    };
    return sensoColors[senso] || 'bg-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] w-[95vw] sm:w-full flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Critérios do Local: {localName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-3 sm:space-y-4">
          {/* Search + Create Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar critério..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={isCreating ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
              className="shrink-0"
            >
              {isCreating ? (
                <X className="h-4 w-4" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Criar</span>
                </>
              )}
            </Button>
          </div>

          {/* Inline Create Form */}
          {isCreating && (
            <div className="bg-muted/40 border rounded-lg p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Novo Critério</h4>
              </div>
              
              <Input
                placeholder="Nome do critério *"
                value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                className="bg-background"
              />
              
              <Textarea
                placeholder="Descrição (opcional)"
                value={newCriterionDescription}
                onChange={(e) => setNewCriterionDescription(e.target.value)}
                className="bg-background resize-none"
                rows={2}
              />
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Senso (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {SENSO_OPTIONS.map((senso) => (
                    <button
                      key={senso}
                      type="button"
                      onClick={() => handleToggleSenso(senso)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        newCriterionSenso.includes(senso)
                          ? `${getSensoColor(senso)} text-white ring-2 ring-offset-2 ring-offset-background`
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {senso}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCriterionName('');
                    setNewCriterionDescription('');
                    setNewCriterionSenso([]);
                  }}
                  disabled={isCreatingSaving}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateCriterion}
                  disabled={isCreatingSaving || !newCriterionName.trim()}
                >
                  {isCreatingSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar e Vincular
                </Button>
              </div>
            </div>
          )}

          {/* Criteria List */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCriteria.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum critério encontrado' : 'Nenhum critério disponível'}
              </div>
            ) : (
              filteredCriteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="flex items-start space-x-3 p-2.5 sm:p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleToggleCriterion(criterion.id)}
                >
                  <Checkbox
                    checked={linkedCriteriaIds.has(criterion.id)}
                    onCheckedChange={() => handleToggleCriterion(criterion.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm">{criterion.name}</p>
                      {criterion.senso && criterion.senso.length > 0 && (
                        <div className="flex gap-1">
                          {criterion.senso.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className={`${getSensoColor(s)} text-white text-xs px-1.5 py-0`}
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {criterion.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {criterion.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Counter */}
          <div className="text-sm text-muted-foreground text-center">
            {selectedCount} de {totalCount} critérios selecionados
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-3 sm:pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
