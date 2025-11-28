import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      fetchData();
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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Critérios do Local: {localName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar critério..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Criteria List */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-3">
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
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleToggleCriterion(criterion.id)}
                >
                  <Checkbox
                    checked={linkedCriteriaIds.has(criterion.id)}
                    onCheckedChange={() => handleToggleCriterion(criterion.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
