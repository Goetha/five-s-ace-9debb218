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
} from '@/lib/offlineStorage';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

export function useOfflineSync() {
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

      for (const item of pendingItems) {
        try {
          if (item.type === 'create') {
            if (item.table === 'audits') {
              const { error } = await supabase.from('audits').insert(item.data);
              if (!error) {
                await removePendingSync(item.id);
              }
            } else if (item.table === 'audit_items') {
              const { error } = await supabase.from('audit_items').insert(item.data);
              if (!error) {
                await removePendingSync(item.id);
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
              }
            } else if (item.table === 'audit_items') {
              const { id, ...updateData } = item.data;
              const { error } = await supabase
                .from('audit_items')
                .update(updateData)
                .eq('id', id);
              if (!error) {
                await removePendingSync(item.id);
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
        }
      }

      await updatePendingCount();
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));
    } catch (error) {
      console.error('Error during sync:', error);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

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
