import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Plus, X, CheckCircle2 } from 'lucide-react';
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
      setIsCreating(false);
      setNewCriterionName('');
      setNewCriterionDescription('');
      setNewCriterionSenso([]);
    }
  }, [isOpen, localId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: criteria, error: criteriaError } = await supabase
        .from('company_criteria')
        .select('id, name, description, senso, scoring_type')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (criteriaError) throw criteriaError;

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

      setAllCriteria(prev => [...prev, newCriterion].sort((a, b) => a.name.localeCompare(b.name)));
      setLinkedCriteriaIds(prev => new Set([...prev, newCriterion.id]));

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
      const { data: currentLinked, error: fetchError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', localId);

      if (fetchError) throw fetchError;

      const currentIds = new Set(currentLinked?.map(l => l.criterion_id) || []);
      const selectedIds = linkedCriteriaIds;

      const toAdd = [...selectedIds].filter(id => !currentIds.has(id));
      const toRemove = [...currentIds].filter(id => !selectedIds.has(id));

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

  return (
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
          {/* Search + Create Button */}
          <div className="px-4 sm:px-5 py-3 border-b bg-background">
            {/* Search Bar */}
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
                    onClick={() => setIsCreating(true)}
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
                          <p className={`text-sm leading-tight ${isSelected ? 'font-medium' : ''}`}>
                            {criterion.name}
                          </p>
                          {criterion.senso && criterion.senso.length > 0 && (
                            <div className="flex gap-1 shrink-0">
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
          {/* Create Form */}
          {isCreating ? (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <Input
                placeholder="Nome do critério *"
                value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                className="h-9 bg-background"
                autoFocus
              />
              
              <Textarea
                placeholder="Descrição (opcional)"
                value={newCriterionDescription}
                onChange={(e) => setNewCriterionDescription(e.target.value)}
                className="bg-background resize-none min-h-[56px]"
                rows={2}
              />
              
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Senso (opcional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {SENSO_OPTIONS.map((senso) => (
                    <button
                      key={senso}
                      type="button"
                      onClick={() => handleToggleSenso(senso)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        newCriterionSenso.includes(senso)
                          ? `${getSensoColor(senso)} text-white`
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {senso}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCriterionName('');
                    setNewCriterionDescription('');
                    setNewCriterionSenso([]);
                  }}
                  disabled={isCreatingSaving}
                  className="flex-1 h-8"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateCriterion}
                  disabled={isCreatingSaving || !newCriterionName.trim()}
                  className="flex-1 h-8"
                >
                  {isCreatingSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Criar e Vincular
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="w-full justify-center text-primary border-dashed hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Critério
            </Button>
          )}

          {/* Action Buttons */}
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
  );
}
