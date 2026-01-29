import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChecklistItem } from "./ChecklistItem";
import { EmptyAuditWarning } from "@/components/auditorias/EmptyAuditWarning";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, CloudOff, Database, AlertTriangle, Camera, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import type { AuditItem } from "@/types/audit";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  isOfflineId,
  getFromStore,
  getCachedAuditItemsByAuditId,
  addToStore,
  completeOfflineAudit,
  getAllFromStore,
  addPendingSync,
  initDB,
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
  const [isDataFromCache, setIsDataFromCache] = useState(false);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Determine if we should use offline mode
  const shouldUseOfflineMode = isOfflineAudit || isOfflineId(auditId) || isOffline;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    if (isOfflineAudit || isOfflineId(auditId)) {
      await fetchOfflineAuditItems();
    } else if (!navigator.onLine || isOffline) {
      // Try to get from cache for regular audits when offline
      await fetchFromCacheOrOnline();
    } else {
      await fetchAuditItems();
    }
  }, [auditId, isOfflineAudit, isOffline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setIsDataFromCache(true);
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

  const fetchFromCacheOrOnline = async () => {
    try {
      // First try to get from cache
      const cachedAudit = await getFromStore<any>('audits', auditId);
      const cachedItems = await getCachedAuditItemsByAuditId(auditId);
      
      if (cachedAudit && cachedItems && cachedItems.length > 0) {
        setLocationName(cachedAudit._locationName || cachedAudit.environments?.name || 'Local');
        setItems(cachedItems);
        setIsDataFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // If no cache, we're offline and can't fetch
      toast({
        title: "Dados não disponíveis offline",
        description: "Esta auditoria não está no cache. Conecte-se à internet.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error fetching from cache:', error);
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
      setIsDataFromCache(false);
      
      // Cache for offline use
      if (auditData) {
        await addToStore('audits', { ...auditData, _locationName: auditData.environments.name });
      }
      if (itemsWithSenso.length > 0) {
        for (const item of itemsWithSenso) {
          await addToStore('auditItems', item);
        }
      }
    } catch (error) {
      console.error('Error fetching audit items:', error);
      // Try cache as fallback
      await fetchFromCacheOrOnline();
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Accept answer as boolean | null to allow photos/comments before answering
  const handleAnswerChange = async (itemId: string, answer: boolean | null, photoUrls?: string[], comment?: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { 
            ...item, 
            answer,  // Can be null, true, or false
            // Fix: properly handle photo removal - if photoUrls is undefined or empty, clear the photo_url
            photo_url: photoUrls && photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
            comment: comment !== undefined ? comment : item.comment
          }
        : item
    );
    setItems(updatedItems);

    // FIXED: ALWAYS save to IndexedDB immediately in offline mode (even if answer is null)
    if (shouldUseOfflineMode) {
      const updatedItem = updatedItems.find(i => i.id === itemId);
      if (updatedItem) {
        try {
          // Ensure DB is initialized before saving
          await initDB();
          // Ensure item has audit_id set correctly
          const itemToSave = { ...updatedItem, audit_id: auditId };
          await addToStore('auditItems', itemToSave);
          console.log(`[AuditChecklist] ✅ Item ${itemId} saved to cache`, { 
            answer, 
            hasPhotos: !!photoUrls?.length,
            hasComment: !!comment?.length 
          });
        } catch (err) {
          console.error(`[AuditChecklist] ❌ Failed to save item ${itemId}:`, err);
        }
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
      console.log('[AuditChecklist] 💾 Saving draft...', { 
        auditId, 
        isOfflineAudit, 
        isOffline, 
        shouldUseOfflineMode,
        itemsCount: items.length 
      });
      
      if (shouldUseOfflineMode) {
        // CRITICAL: Initialize DB first and verify it works
        try {
          await initDB();
          console.log('[AuditChecklist] ✅ IndexedDB initialized successfully');
        } catch (dbError) {
          console.error('[AuditChecklist] ❌ Failed to init IndexedDB:', dbError);
          throw new Error('Não foi possível acessar o armazenamento offline');
        }
        
        // FIXED: First ensure the audit record exists in cache
        let auditData = await getFromStore<any>('audits', auditId);
        if (!auditData) {
          console.log('[AuditChecklist] ⚠️ Audit not found in cache, creating new entry');
          auditData = {
            id: auditId,
            status: 'in_progress',
            total_questions: items.length,
            total_yes: 0,
            total_no: 0,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _isOffline: true,
          };
        }
        
        // Update counts
        auditData.total_questions = items.length;
        auditData.total_yes = items.filter(i => i.answer === true).length;
        auditData.total_no = items.filter(i => i.answer === false).length;
        auditData.updated_at = new Date().toISOString();
        
        // Save the audit record first
        await addToStore('audits', auditData);
        console.log('[AuditChecklist] ✅ Audit record saved/updated');
        
        // Save all items with correct audit_id
        let savedCount = 0;
        const errors: string[] = [];
        
        for (const item of items) {
          try {
            // CRITICAL: Ensure every item has the correct audit_id
            const itemToSave = {
              ...item,
              audit_id: auditId,
            };
            await addToStore('auditItems', itemToSave);
            savedCount++;
          } catch (itemError) {
            console.error('[AuditChecklist] ❌ Error saving item:', item.id, itemError);
            errors.push(item.id);
          }
        }
        console.log(`[AuditChecklist] ✅ Saved ${savedCount}/${items.length} items to IndexedDB`);
        
        if (errors.length > 0) {
          toast({
            title: "⚠️ Rascunho parcialmente salvo",
            description: `${savedCount} de ${items.length} itens salvos. Alguns itens falharam.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "✅ Rascunho salvo offline",
            description: `${savedCount} itens salvos localmente. Será sincronizado quando online.`
          });
        }
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
      console.error('[AuditChecklist] ❌ Error saving draft:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro ao acessar armazenamento local. Tente novamente.",
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

  // Get non-conforming items that are incomplete with details
  const getIncompleteNonConformities = () => {
    return items.filter(item => 
      item.answer === false && (!itemHasPhotos(item) || !itemHasComment(item))
    ).map((item, idx) => ({
      ...item,
      index: items.findIndex(i => i.id === item.id),
      missingPhoto: !itemHasPhotos(item),
      missingComment: !itemHasComment(item)
    }));
  };

  const incompleteNonConformities = getIncompleteNonConformities();
  const totalNonConformities = items.filter(item => item.answer === false).length;

  // Scroll to and highlight a specific item
  const scrollToItem = (itemId: string) => {
    setHighlightedItemId(itemId);
    const element = itemRefs.current[itemId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedItemId(null), 3000);
    }
  };

  const handleComplete = async () => {
    const unanswered = items.filter(item => item.answer === null).length;
    if (unanswered > 0) {
      // Show pending details and scroll to first unanswered
      setShowPendingDetails(true);
      const firstUnanswered = items.find(item => item.answer === null);
      if (firstUnanswered) {
        setTimeout(() => scrollToItem(firstUnanswered.id), 100);
      }
      return;
    }

    // Validate only non-conforming items need photo and comment
    if (incompleteNonConformities.length > 0) {
      // Show pending details and scroll to first incomplete
      setShowPendingDetails(true);
      const firstIncomplete = incompleteNonConformities[0];
      if (firstIncomplete) {
        setTimeout(() => scrollToItem(firstIncomplete.id), 100);
      }
      return;
    }

    setIsSaving(true);
    try {
      console.log('[AuditChecklist] 🏁 Completing audit...', { 
        auditId, 
        shouldUseOfflineMode,
        itemsCount: items.length 
      });
      
      if (shouldUseOfflineMode) {
        // CRITICAL: Initialize DB first
        try {
          await initDB();
        } catch (dbError) {
          console.error('[AuditChecklist] ❌ Failed to init IndexedDB:', dbError);
          throw new Error('Não foi possível acessar o armazenamento offline');
        }
        
        // Complete offline audit - First save all items with correct audit_id
        console.log('[AuditChecklist] 💾 Saving all items before completing...');
        for (const item of items) {
          const itemToSave = { ...item, audit_id: auditId };
          await addToStore('auditItems', itemToSave);
        }
        console.log('[AuditChecklist] ✅ All items saved');
        
        // Calculate scores locally
        const totalQuestions = items.length;
        const totalYes = items.filter(item => item.answer === true).length;
        const totalNo = items.filter(item => item.answer === false).length;
        const score = Math.round((totalYes / totalQuestions) * 100);
        const scoreLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
        
        // FIXED: Get or create the audit record
        let auditData = await getFromStore<any>('audits', auditId);
        if (!auditData) {
          console.warn('[AuditChecklist] ⚠️ Audit not found in cache, creating entry');
          auditData = {
            id: auditId,
            status: 'in_progress',
            _isOffline: true,
          };
        }
        
        const completedAudit = {
          ...auditData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_questions: totalQuestions,
          total_yes: totalYes,
          total_no: totalNo,
          score,
          score_level: scoreLevel,
        };
        await addToStore('audits', completedAudit);
        
        // Add to pending sync
        await addPendingSync('update', 'offline_audit_complete', {
          auditId,
          total_questions: totalQuestions,
          total_yes: totalYes,
          total_no: totalNo,
          score,
          score_level: scoreLevel,
        });
        
        console.log('[AuditChecklist] ✅ Audit completed offline:', { score, scoreLevel });
        
        toast({
          title: "✅ Auditoria finalizada offline",
          description: `Pontuação: ${score}%. Será sincronizada quando você voltar online.`
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
        if (score >= 80) scoreLevel = 'high';
        else if (score >= 50) scoreLevel = 'medium';
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
      }
    } catch (error) {
      console.error('[AuditChecklist] ❌ Error completing audit:', error);
      toast({
        title: "Erro ao finalizar auditoria",
        description: error instanceof Error ? error.message : "Tente novamente.",
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
            <div className="flex gap-1">
              {isDataFromCache && (
                <Badge variant="outline" className="gap-1 text-blue-500 border-blue-500/30">
                  <Database className="h-3 w-3" />
                  Cache
                </Badge>
              )}
              {shouldUseOfflineMode && (
                <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                  <CloudOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{answered} de {items.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Pending items alert - shows when user tries to complete without finishing */}
          {(showPendingDetails && (progress < 100 || incompleteNonConformities.length > 0)) && (
            <Collapsible open={showPendingDetails} onOpenChange={setShowPendingDetails}>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-3">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        {progress < 100 
                          ? `${items.length - answered} pergunta(s) sem resposta`
                          : `${incompleteNonConformities.length} não conformidade(s) incompleta(s)`
                        }
                      </span>
                    </div>
                    {showPendingDetails ? (
                      <ChevronUp className="h-4 w-4 text-destructive" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-destructive" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 space-y-2">
                    {/* Unanswered questions */}
                    {progress < 100 && items.filter(i => i.answer === null).map((item, idx) => {
                      const itemIndex = items.findIndex(i => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => scrollToItem(item.id)}
                          className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-destructive/10 transition-colors"
                        >
                          <Badge variant="outline" className="shrink-0 text-destructive border-destructive/30">
                            #{itemIndex + 1}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate flex-1">
                            {item.question.slice(0, 50)}{item.question.length > 50 ? '...' : ''}
                          </span>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Sem resposta
                          </Badge>
                        </button>
                      );
                    })}
                    {/* Incomplete non-conformities */}
                    {progress >= 100 && incompleteNonConformities.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToItem(item.id)}
                        className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Badge variant="outline" className="shrink-0 text-destructive border-destructive/30">
                          #{item.index + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {item.question.slice(0, 40)}{item.question.length > 40 ? '...' : ''}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          {item.missingPhoto && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <Camera className="h-3 w-3" />
                              Foto
                            </Badge>
                          )}
                          {item.missingComment && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Comentário
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Non-conformities pending indicator (when not showing details) */}
          {!showPendingDetails && totalNonConformities > 0 && (
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
          <div 
            key={item.id} 
            ref={(el) => { itemRefs.current[item.id] = el; }}
            className={highlightedItemId === item.id ? 'ring-2 ring-destructive ring-offset-2 rounded-lg transition-all duration-300' : ''}
          >
            <ChecklistItem
              item={item}
              index={index}
              onAnswerChange={handleAnswerChange}
              isOfflineAudit={shouldUseOfflineMode}
            />
          </div>
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
            disabled={isSaving}
            className="flex-1 text-xs sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
            ) : null}
            {shouldUseOfflineMode ? 'Finalizar Offline' : 'Finalizar Auditoria'}
          </Button>
        </div>
      </Card>
    </div>
  );
}