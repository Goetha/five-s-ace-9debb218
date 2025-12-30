import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChecklistItem } from "./ChecklistItem";
import { EmptyAuditWarning } from "@/components/auditorias/EmptyAuditWarning";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, CloudOff } from "lucide-react";
import type { AuditItem } from "@/types/audit";
import {
  isOfflineId,
  getFromStore,
  getCachedAuditItemsByAuditId,
  addToStore,
  completeOfflineAudit,
} from "@/lib/offlineStorage";

interface AuditChecklistProps {
  auditId: string;
  isOfflineAudit?: boolean;
  onCompleted: () => void;
}

export function AuditChecklist({ auditId, isOfflineAudit = false, onCompleted }: AuditChecklistProps) {
  const { toast } = useToast();
  const { isOffline } = useAuth();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    if (isOfflineAudit || isOfflineId(auditId)) {
      fetchOfflineAuditItems();
    } else {
      fetchAuditItems();
    }
  }, [auditId, isOfflineAudit]);

  const fetchOfflineAuditItems = async () => {
    try {
      // Get audit from IndexedDB
      const auditData = await getFromStore<any>('audits', auditId);
      if (auditData) {
        setLocationName(auditData._locationName || 'Local offline');
      }

      // Get items from IndexedDB
      const itemsData = await getCachedAuditItemsByAuditId(auditId);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching offline audit items:', error);
      toast({
        title: "Erro ao carregar auditoria",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        .select(`
          *,
          company_criteria!audit_items_criterion_id_fkey(senso)
        `)
        .eq('audit_id', auditId)
        .order('created_at');

      if (error) throw error;
      
      // Map senso from company_criteria to item
      const itemsWithSenso = (data || []).map(item => ({
        ...item,
        senso: item.company_criteria?.senso || null
      }));
      setItems(itemsWithSenso);
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

  const handleAnswerChange = async (itemId: string, answer: boolean, photoUrls?: string[], comment?: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { 
            ...item, 
            answer, 
            photo_url: photoUrls && photoUrls.length > 0 ? JSON.stringify(photoUrls) : item.photo_url,
            comment: comment !== undefined ? comment : item.comment
          }
        : item
    );
    setItems(updatedItems);

    // If offline audit, save to IndexedDB immediately
    if (isOfflineAudit || isOfflineId(auditId)) {
      const updatedItem = updatedItems.find(i => i.id === itemId);
      if (updatedItem) {
        await addToStore('auditItems', updatedItem);
      }
    }
  };

  const calculateProgress = () => {
    const answered = items.filter(item => item.answer !== null).length;
    return (answered / items.length) * 100;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      if (isOfflineAudit || isOfflineId(auditId) || isOffline) {
        // Save to IndexedDB
        for (const item of items) {
          await addToStore('auditItems', item);
        }
        toast({
          title: "Rascunho salvo offline",
          description: "Será sincronizado quando você voltar online."
        });
      } else {
        // Save to server
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
      }
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

  // Helper to check if item has photos
  const itemHasPhotos = (item: AuditItem): boolean => {
    if (!item.photo_url) return false;
    try {
      const photos = JSON.parse(item.photo_url);
      return Array.isArray(photos) && photos.length > 0;
    } catch {
      return !!item.photo_url;
    }
  };

  // Helper to check if item has comment
  const itemHasComment = (item: AuditItem): boolean => {
    return !!item.comment && item.comment.trim().length > 0;
  };

  // Get non-conforming items that are incomplete
  const getIncompleteNonConformities = () => {
    return items.filter(item => 
      item.answer === false && (!itemHasPhotos(item) || !itemHasComment(item))
    );
  };

  const incompleteNonConformities = getIncompleteNonConformities();
  const totalNonConformities = items.filter(item => item.answer === false).length;

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

    // Validate only non-conforming items need photo and comment
    if (incompleteNonConformities.length > 0) {
      toast({
        title: "Não conformidades incompletas",
        description: `${incompleteNonConformities.length} item(ns) não conforme(s) precisam de foto e comentário.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isOfflineAudit || isOfflineId(auditId) || isOffline) {
        // Complete offline audit
        // First save all items
        for (const item of items) {
          await addToStore('auditItems', item);
        }
        
        // Then complete the audit
        await completeOfflineAudit(auditId, {});
        
        toast({
          title: "Auditoria finalizada offline",
          description: "Será sincronizada quando você voltar online."
        });
        
        onCompleted();
      } else {
        // Save all items to server
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

      // Calculate scores - using 0-100 scale (percentage)
      const totalQuestions = items.length;
      const totalYes = items.filter(item => item.answer === true).length;
      const totalNo = items.filter(item => item.answer === false).length;
      const score = Math.round((totalYes / totalQuestions) * 100);
      
      let scoreLevel: 'low' | 'medium' | 'high';
      if (score >= 80) scoreLevel = 'high';      // >= 80% = Excelente
      else if (score >= 50) scoreLevel = 'medium'; // 50-79% = Atenção
      else scoreLevel = 'low';                     // < 50% = Crítico

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
      }
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

  if (items.length === 0) {
    return <EmptyAuditWarning auditId={auditId} locationName={locationName} />;
  }

  const progress = calculateProgress();
  const answered = items.filter(item => item.answer !== null).length;

  return (
    <div className="space-y-3 sm:space-y-6">
      <Card className="p-3 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-2xl font-bold">{locationName}</h2>
            {(isOfflineAudit || isOffline) && (
              <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                <CloudOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{answered} de {items.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Non-conformities pending indicator */}
          {totalNonConformities > 0 && (
            <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
              <span className="text-muted-foreground">Não conformidades</span>
              <span className={incompleteNonConformities.length > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                {incompleteNonConformities.length > 0 
                  ? `${incompleteNonConformities.length} pendente(s)`
                  : `${totalNonConformities} completa(s)`
                }
              </span>
            </div>
          )}
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
            {isOfflineAudit || isOffline ? 'Finalizar Offline' : 'Finalizar Auditoria'}
          </Button>
        </div>
      </Card>
    </div>
  );
}