import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  initDB,
  getPendingSync,
  removePendingSync,
  addPendingSync,
  cacheAudits,
  cacheCriteria,
  cacheEnvironments,
  getCachedAudits,
  getCachedCriteria,
  getCachedEnvironments,
  addToStore,
  getOfflineAudits,
  removeOfflineAudit,
  mapOfflineToRealId,
  getCachedAuditItemsByAuditId,
  isOfflineId,
} from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

export function useOfflineSync() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
  });

  // Initialize IndexedDB on mount
  useEffect(() => {
    initDB().catch(console.error);
    updatePendingCount();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      syncPendingChanges();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const pending = await getPendingSync();
      setStatus(prev => ({ ...prev, pendingCount: pending.length }));
    } catch (error) {
      console.error('Error getting pending count:', error);
    }
  };

  // Sync pending changes to server
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine) return;

    setStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const pendingItems = await getPendingSync();
      let syncedCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        try {
          // Handle offline audit creation
          if (item.type === 'create' && item.table === 'offline_audit') {
            const { audit, items } = item.data;
            
            // Create the audit on server
            const { data: createdAudit, error: auditError } = await supabase
              .from('audits')
              .insert({
                company_id: audit.company_id,
                location_id: audit.location_id,
                auditor_id: audit.auditor_id,
                status: audit.status,
                started_at: audit.started_at,
                total_questions: audit.total_questions,
                total_yes: audit.total_yes || 0,
                total_no: audit.total_no || 0,
              })
              .select()
              .single();

            if (auditError) {
              console.error('Error creating audit:', auditError);
              errorCount++;
              continue;
            }

            // Create audit items
            const auditItems = items.map((i: any) => ({
              audit_id: createdAudit.id,
              criterion_id: i.criterion_id,
              question: i.question,
              answer: null,
            }));

            const { error: itemsError } = await supabase
              .from('audit_items')
              .insert(auditItems);

            if (itemsError) {
              console.error('Error creating audit items:', itemsError);
              errorCount++;
              continue;
            }

            // Map offline ID to real ID
            // Note: We need to find the offline audit ID from pending sync data
            const offlineAudits = await getOfflineAudits();
            const matchingOfflineAudit = offlineAudits.find(
              a => a.company_id === audit.company_id && 
                   a.location_id === audit.location_id &&
                   a.auditor_id === audit.auditor_id
            );

            if (matchingOfflineAudit) {
              await mapOfflineToRealId(matchingOfflineAudit.id, createdAudit.id, 'audit');
              await removeOfflineAudit(matchingOfflineAudit.id);
            }

            await removePendingSync(item.id);
            syncedCount++;
            continue;
          }

          // Handle offline audit item updates
          if (item.type === 'update' && item.table === 'offline_audit_item') {
            // These will be handled when the audit is synced
            // For now, skip them as the audit sync handles all items
            await removePendingSync(item.id);
            continue;
          }

          // Handle offline audit completion
          if (item.type === 'update' && item.table === 'offline_audit_complete') {
            // This should sync the completion data
            // First, we need to find the real audit ID
            const { auditId, ...updateData } = item.data;
            
            if (isOfflineId(auditId)) {
              // Audit might not be synced yet, skip for now
              continue;
            }

            const { error } = await supabase
              .from('audits')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                observations: updateData.observations,
                next_audit_date: updateData.next_audit_date,
                total_yes: updateData.total_yes,
                total_no: updateData.total_no,
                score: updateData.score,
                score_level: updateData.score_level,
              })
              .eq('id', auditId);

            if (!error) {
              await removePendingSync(item.id);
              syncedCount++;
            } else {
              errorCount++;
            }
            continue;
          }

          // Handle regular creates
          if (item.type === 'create') {
            if (item.table === 'audits') {
              const { error } = await supabase.from('audits').insert(item.data);
              if (!error) {
                await removePendingSync(item.id);
                syncedCount++;
              } else {
                errorCount++;
              }
            } else if (item.table === 'audit_items') {
              const { error } = await supabase.from('audit_items').insert(item.data);
              if (!error) {
                await removePendingSync(item.id);
                syncedCount++;
              } else {
                errorCount++;
              }
            }
          } else if (item.type === 'update') {
            if (item.table === 'audits') {
              const { id, ...updateData } = item.data;
              const { error } = await supabase
                .from('audits')
                .update(updateData)
                .eq('id', id);
              if (!error) {
                await removePendingSync(item.id);
                syncedCount++;
              } else {
                errorCount++;
              }
            } else if (item.table === 'audit_items') {
              const { id, ...updateData } = item.data;
              const { error } = await supabase
                .from('audit_items')
                .update(updateData)
                .eq('id', id);
              if (!error) {
                await removePendingSync(item.id);
                syncedCount++;
              } else {
                errorCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
          errorCount++;
        }
      }

      await updatePendingCount();
      
      if (syncedCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${syncedCount} ${syncedCount === 1 ? 'item sincronizado' : 'itens sincronizados'} com sucesso.`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Erros na sincronização",
          description: `${errorCount} ${errorCount === 1 ? 'item falhou' : 'itens falharam'} ao sincronizar.`,
          variant: "destructive",
        });
      }

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));
    } catch (error) {
      console.error('Error during sync:', error);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [toast]);

  // Save audit offline (for when user is offline)
  const saveAuditOffline = useCallback(async (auditData: any): Promise<string> => {
    const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const audit = { ...auditData, id: offlineId, _isOffline: true };
    
    await addToStore('audits', audit);
    await addPendingSync('create', 'audits', auditData);
    await updatePendingCount();
    
    return offlineId;
  }, []);

  // Save audit item offline
  const saveAuditItemOffline = useCallback(async (itemData: any): Promise<string> => {
    const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { ...itemData, id: offlineId, _isOffline: true };
    
    await addToStore('auditItems', item);
    await addPendingSync('create', 'audit_items', itemData);
    await updatePendingCount();
    
    return offlineId;
  }, []);

  // Update audit offline
  const updateAuditOffline = useCallback(async (auditId: string, updateData: any): Promise<void> => {
    await addPendingSync('update', 'audits', { id: auditId, ...updateData });
    await updatePendingCount();
  }, []);

  // Cache data for offline access
  const cacheDataForOffline = useCallback(async (companyId: string) => {
    if (!navigator.onLine) return;

    try {
      // Cache audits
      const { data: audits } = await supabase
        .from('audits')
        .select('*')
        .eq('company_id', companyId);
      if (audits) await cacheAudits(audits);

      // Cache criteria
      const { data: criteria } = await supabase
        .from('company_criteria')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (criteria) await cacheCriteria(criteria);

      // Cache environments
      const { data: environments } = await supabase
        .from('environments')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (environments) await cacheEnvironments(environments);

      console.log('Data cached for offline use');
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, []);

  // Get cached data when offline
  const getOfflineData = useCallback(async () => {
    const audits = await getCachedAudits();
    const criteria = await getCachedCriteria();
    const environments = await getCachedEnvironments();
    return { audits, criteria, environments };
  }, []);

  return {
    status,
    syncPendingChanges,
    saveAuditOffline,
    saveAuditItemOffline,
    updateAuditOffline,
    cacheDataForOffline,
    getOfflineData,
  };
}