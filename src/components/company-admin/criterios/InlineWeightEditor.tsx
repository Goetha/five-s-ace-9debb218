import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash-es";

interface InlineWeightEditorProps {
  criterionId: string;
  defaultWeight: number; // peso padrão do IFA
  currentWeight: number; // peso customizado atual
  onSave: (criterionId: string, newWeight: number) => Promise<void>;
}

const getWeightIndicator = (weight: number) => {
  if (weight <= 3) return { emoji: '🟢', label: 'Baixo' };
  if (weight <= 7) return { emoji: '🟡', label: 'Médio' };
  return { emoji: '🔥', label: 'Alto/Crítico' };
};

export function InlineWeightEditor({
  criterionId,
  defaultWeight,
  currentWeight,
  onSave
}: InlineWeightEditorProps) {
  const [weight, setWeight] = useState(currentWeight);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setWeight(currentWeight);
  }, [currentWeight]);

  // Debounce para não salvar a cada tecla
  const debouncedSave = useMemo(
    () => debounce(async (newWeight: number) => {
      setSaving(true);
      try {
        await onSave(criterionId, newWeight);
        toast({
          title: "✓ Peso atualizado",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error saving weight:', error);
        toast({
          title: "Erro ao atualizar peso",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }, 500),
    [criterionId, onSave, toast]
  );

  const handleChange = (value: number) => {
    const newWeight = Math.max(1, Math.min(10, value));
    setWeight(newWeight);
    if (newWeight !== currentWeight) {
      debouncedSave(newWeight);
    }
  };

  const handleIncrement = () => {
    if (weight < 10) {
      const newWeight = weight + 1;
      setWeight(newWeight);
      onSave(criterionId, newWeight);
    }
  };

  const handleDecrement = () => {
    if (weight > 1) {
      const newWeight = weight - 1;
      setWeight(newWeight);
      onSave(criterionId, newWeight);
    }
  };

  const handleRestore = async () => {
    setWeight(defaultWeight);
    setSaving(true);
    try {
      await onSave(criterionId, defaultWeight);
      toast({
        title: "✓ Peso restaurado",
        description: `Peso restaurado para padrão (${defaultWeight})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error restoring weight:', error);
      toast({
        title: "Erro ao restaurar peso",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const indicator = getWeightIndicator(weight);
  const isCustomized = weight !== defaultWeight;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
            disabled={weight <= 1 || saving}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={10}
            value={weight}
            onChange={(e) => handleChange(parseInt(e.target.value) || 1)}
            className="w-16 h-8 text-center border-0 focus-visible:ring-0"
            disabled={saving}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleIncrement}
            disabled={weight >= 10 || saving}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        
        <span className="text-lg">{indicator.emoji}</span>
        <span className="text-xs text-muted-foreground">{indicator.label}</span>
        
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isCustomized && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Padrão IFA: {defaultWeight} • Customizado: {weight > defaultWeight ? '+' : ''}{weight - defaultWeight}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleRestore}
            disabled={saving}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restaurar
          </Button>
        </div>
      )}
    </div>
  );
}
