import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CriterionFormData } from "@/types/criterion";

interface NewCriterionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId: string;
}

const sensoDescriptions = {
  '1S': 'Utilização - Separar o necessário do desnecessário',
  '2S': 'Organização - Cada coisa em seu lugar',
  '3S': 'Limpeza - Manter o ambiente limpo',
  '4S': 'Padronização - Manter padrões de qualidade',
  '5S': 'Disciplina - Manter a rotina e melhorar sempre'
};

const sensoColors = {
  '1S': 'bg-red-500',
  '2S': 'bg-orange-500',
  '3S': 'bg-yellow-500',
  '4S': 'bg-green-500',
  '5S': 'bg-blue-500',
};

const availableTags = [
  '🏭 Industrial', '🏢 Escritório', '🚿 Banheiro', '🍽️ Refeitório',
  '📦 Almoxarifado', '🏗️ Obra', '🚗 Estacionamento', '🌳 Área Externa'
];

export function NewCriterionModal({ open, onOpenChange, onSuccess, companyId }: NewCriterionModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CriterionFormData>({
    name: '',
    description: '',
    senso: [],
    scoring_type: '0-10',
    tags: [],
    status: 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.name.length < 10) {
      toast({
        title: "Nome muito curto",
        description: "O nome deve ter no mínimo 10 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.senso.length === 0) {
      toast({
        title: "Selecione pelo menos um senso",
        description: "É necessário selecionar ao menos um senso 5S",
        variant: "destructive"
      });
      return;
    }

    if (formData.description && formData.description.length < 20) {
      toast({
        title: "Descrição muito curta",
        description: "A descrição deve ter no mínimo 20 caracteres",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('company_criteria')
        .insert([{
          company_id: companyId,
          name: formData.name,
          description: formData.description,
          senso: formData.senso,
          scoring_type: formData.scoring_type,
          default_weight: 5,
          custom_weight: 5,
          origin: 'custom',
          tags: formData.tags,
          status: formData.status,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "✓ Critério criado com sucesso!",
        description: "O critério personalizado foi adicionado à sua biblioteca"
      });

      setFormData({
        name: '',
        description: '',
        senso: [],
        scoring_type: '0-10',
        tags: [],
        status: 'active'
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar critério",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleSenso = (senso: string) => {
    setFormData(prev => ({
      ...prev,
      senso: prev.senso.includes(senso as any)
        ? prev.senso.filter(s => s !== senso)
        : [...prev.senso, senso as any]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Critério Personalizado</DialogTitle>
          <DialogDescription>
            Este critério será exclusivo da sua empresa
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-yellow-50 border-yellow-200">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            Use critérios personalizados para avaliar aspectos específicos da sua operação que não estão nos modelos padrão do IFA.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informações Básicas</h3>
            
            <div>
              <Label htmlFor="name">Nome do Critério *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Organização de ferramentas manuais"
                maxLength={150}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.name.length}/150 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="description">Descrição/Instrução</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva como avaliar este critério..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description?.length || 0}/500 caracteres
              </p>
            </div>
          </div>

          {/* Seção 2: Classificação 5S */}
          <div className="space-y-4">
            <h3 className="font-semibold">Classificação 5S</h3>
            
            <div>
              <Label>Sensos 5S * (selecione um ou mais)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione todos os sensos 5S aplicáveis a este critério
              </p>
              
              <div className="space-y-3">
                {Object.entries(sensoDescriptions).map(([senso, description]) => (
                  <div key={senso} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={`senso-${senso}`}
                      checked={formData.senso.includes(senso as any)}
                      onCheckedChange={() => toggleSenso(senso)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1 cursor-pointer" onClick={() => toggleSenso(senso)}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${sensoColors[senso as keyof typeof sensoColors]} text-white`}>
                          {senso}
                        </Badge>
                        <span className="font-medium">
                          {description.split(' - ')[0]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {description.split(' - ')[1]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.senso.length > 0 && (
                <Alert className="mt-3 bg-green-50 border-green-200">
                  <AlertDescription className="text-sm text-green-800">
                    ✓ {formData.senso.length} senso{formData.senso.length > 1 ? 's' : ''} selecionado{formData.senso.length > 1 ? 's' : ''}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Seção 3: Sistema de Pontuação */}
          <div className="space-y-4">
            <h3 className="font-semibold">Sistema de Pontuação</h3>
            
            <div>
              <Label htmlFor="scoring_type">Tipo de Avaliação *</Label>
              <Select value={formData.scoring_type} onValueChange={(value: any) => setFormData({ ...formData, scoring_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-10">Escala 0-10 (recomendado)</SelectItem>
                  <SelectItem value="conform-non-conform">Conforme / Não Conforme (C/NC)</SelectItem>
                  <SelectItem value="0-5">Escala 0-5</SelectItem>
                  <SelectItem value="percentage">Percentual (0-100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção 4: Categorização */}
          <div className="space-y-4">
            <h3 className="font-semibold">Categorização</h3>
            
            <div>
              <Label>Tags/Categorias</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Status Inicial</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
                <label htmlFor="status" className="text-sm cursor-pointer">
                  Ativo - Disponível para auditorias
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Critério Personalizado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
