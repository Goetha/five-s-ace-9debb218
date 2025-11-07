import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChecklistItem } from "./ChecklistItem";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import type { AuditItem } from "@/types/audit";

interface AuditChecklistProps {
  auditId: string;
  onCompleted: () => void;
}

export function AuditChecklist({ auditId, onCompleted }: AuditChecklistProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    fetchAuditItems();
  }, [auditId]);

  const fetchAuditItems = async () => {
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('audits')
        .select(`
          *,
          environments!audits_location_id_fkey(name)
        `)
        .eq('id', auditId)
        .single();

      if (auditError) throw auditError;
      setLocationName(auditData.environments.name);

      const { data, error } = await supabase
        .from('audit_items')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching audit items:', error);
      toast({
        title: "Erro ao carregar auditoria",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (itemId: string, answer: boolean, photoUrl?: string, comment?: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, answer, photo_url: photoUrl || item.photo_url, comment: comment || item.comment }
          : item
      )
    );
  };

  const calculateProgress = () => {
    const answered = items.filter(item => item.answer !== null).length;
    return (answered / items.length) * 100;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      for (const item of items) {
        if (item.answer !== null) {
          await supabase
            .from('audit_items')
            .update({
              answer: item.answer,
              photo_url: item.photo_url,
              comment: item.comment
            })
            .eq('id', item.id);
        }
      }

      toast({
        title: "Rascunho salvo",
        description: "Você pode continuar depois."
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    const unanswered = items.filter(item => item.answer === null).length;
    if (unanswered > 0) {
      toast({
        title: "Auditoria incompleta",
        description: `Ainda faltam ${unanswered} perguntas para responder.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Save all items
      for (const item of items) {
        await supabase
          .from('audit_items')
          .update({
            answer: item.answer,
            photo_url: item.photo_url,
            comment: item.comment
          })
          .eq('id', item.id);
      }

      // Calculate scores
      const totalQuestions = items.length;
      const totalYes = items.filter(item => item.answer === true).length;
      const totalNo = items.filter(item => item.answer === false).length;
      const score = (totalYes / totalQuestions) * 10;
      
      let scoreLevel: 'low' | 'medium' | 'high';
      if (score >= 9) scoreLevel = 'high';
      else if (score >= 5) scoreLevel = 'medium';
      else scoreLevel = 'low';

      // Update audit
      await supabase
        .from('audits')
        .update({
          total_questions: totalQuestions,
          total_yes: totalYes,
          total_no: totalNo,
          score: score,
          score_level: scoreLevel,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', auditId);

      toast({
        title: "Auditoria finalizada",
        description: "A avaliação foi concluída com sucesso!"
      });

      onCompleted();
    } catch (error) {
      console.error('Error completing audit:', error);
      toast({
        title: "Erro ao finalizar auditoria",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const progress = calculateProgress();
  const answered = items.filter(item => item.answer !== null).length;

  return (
    <div className="space-y-3 sm:space-y-6">
      <Card className="p-3 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold">Avalie o Nível de Gestão 5S</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Local: {locationName}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{answered} de {items.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </Card>

      <div className="space-y-2 sm:space-y-3">
        {items.map((item, index) => (
          <ChecklistItem
            key={item.id}
            item={item}
            index={index}
            onAnswerChange={handleAnswerChange}
          />
        ))}
      </div>

      <Card className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex-1 text-xs sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSaving || progress < 100}
            className="flex-1 text-xs sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
            ) : null}
            Finalizar Auditoria
          </Button>
        </div>
      </Card>
    </div>
  );
}
