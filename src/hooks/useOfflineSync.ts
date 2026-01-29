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
  getAllOfflinePhotos,
  getOfflinePhoto,
  deleteOfflinePhoto,
  isOfflinePhotoUrl,
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
      const offlinePhotos = await getAllOfflinePhotos();
      setStatus(prev => ({ ...prev, pendingCount: pending.length + offlinePhotos.length }));
    } catch (error) {
      console.error('Error getting pending count:', error);
    }
  };

  // Upload an offline photo to Supabase Storage
  const uploadOfflinePhoto = async (photoId: string, auditItemId: string): Promise<string | null> => {
    try {
      const photo = await getOfflinePhoto(photoId);
      if (!photo) {
        console.warn(`Photo not found in cache: ${photoId}`);
        return null;
      }

      // Convert base64 to blob
      const base64Response = await fetch(photo.base64);
      const blob = await base64Response.blob();

      // Generate file path
      const fileExt = photo.fileName.split('.').pop() || 'jpg';
      const fileName = `${auditItemId}_synced_${Date.now()}.${fileExt}`;
      const filePath = `audit-items/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('audit-photos')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audit-photos')
        .getPublicUrl(filePath);

      // Delete from IndexedDB after successful upload
      await deleteOfflinePhoto(photoId);
      
      console.log(`✅ Photo synced: ${photoId} → ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading offline photo:', error);
      return null;
    }
  };

  // Replace offline photo URLs with real URLs in an array
  const replaceOfflinePhotoUrls = async (photoUrls: string[], auditItemId: string): Promise<string[]> => {
    const newUrls: string[] = [];
    
    for (const url of photoUrls) {
      if (isOfflinePhotoUrl(url)) {
        const realUrl = await uploadOfflinePhoto(url, auditItemId);
        if (realUrl) {
          newUrls.push(realUrl);
        }
        // If upload failed, we skip the photo (it will be lost)
      } else {
        // Keep existing online URLs
        newUrls.push(url);
      }
    }
    
    return newUrls;
  };

  // Sync pending changes to server
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine) return;

    setStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const pendingItems = await getPendingSync();
      let syncedCount = 0;
      let errorCount = 0;
      let photosSyncedCount = 0;

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

            // Get the offline audit items to sync their responses and photos
            const offlineAudits = await getOfflineAudits();
            const matchingOfflineAudit = offlineAudits.find(
              a => a.company_id === audit.company_id && 
                   a.location_id === audit.location_id &&
                   a.auditor_id === audit.auditor_id
            );

            let offlineAuditId: string | null = null;
            if (matchingOfflineAudit) {
              offlineAuditId = matchingOfflineAudit.id;
            }

            // Get offline items with answers
            let offlineItems: any[] = [];
            if (offlineAuditId) {
              offlineItems = await getCachedAuditItemsByAuditId(offlineAuditId);
            }

            // Create audit items with synced photos
            const auditItems = [];
            for (const itemDef of items) {
              // Find the matching offline item to get answer, photos, comment
              const offlineItem = offlineItems.find(oi => oi.criterion_id === itemDef.criterion_id);
              
              let photoUrl: string | null = null;
              if (offlineItem?.photo_url) {
                try {
                  const photoUrls = JSON.parse(offlineItem.photo_url);
                  if (Array.isArray(photoUrls) && photoUrls.length > 0) {
                    // Upload offline photos and replace URLs
                    const realUrls = await replaceOfflinePhotoUrls(photoUrls, offlineItem.id);
                    if (realUrls.length > 0) {
                      photoUrl = JSON.stringify(realUrls);
                      photosSyncedCount += realUrls.length;
                    }
                  }
                } catch (e) {
                  // Not JSON, might be a single URL
                  if (isOfflinePhotoUrl(offlineItem.photo_url)) {
                    const realUrl = await uploadOfflinePhoto(offlineItem.photo_url, offlineItem.id);
                    if (realUrl) {
                      photoUrl = JSON.stringify([realUrl]);
                      photosSyncedCount++;
                    }
                  } else {
                    photoUrl = offlineItem.photo_url;
                  }
                }
              }

              auditItems.push({
                audit_id: createdAudit.id,
                criterion_id: itemDef.criterion_id,
                question: itemDef.question,
                answer: offlineItem?.answer ?? null,
                photo_url: photoUrl,
                comment: offlineItem?.comment ?? null,
              });
            }

            const { error: itemsError } = await supabase
              .from('audit_items')
              .insert(auditItems);

            if (itemsError) {
              console.error('Error creating audit items:', itemsError);
              errorCount++;
              continue;
            }

            // If the offline audit was completed, update the created audit
            if (matchingOfflineAudit && matchingOfflineAudit.status === 'completed') {
              const { error: completeError } = await supabase
                .from('audits')
                .update({
                  status: 'completed',
                  completed_at: matchingOfflineAudit.completed_at,
                  total_questions: matchingOfflineAudit.total_questions,
                  total_yes: matchingOfflineAudit.total_yes,
                  total_no: matchingOfflineAudit.total_no,
                  score: matchingOfflineAudit.score,
                  score_level: matchingOfflineAudit.score_level,
                  observations: matchingOfflineAudit.observations,
                  next_audit_date: matchingOfflineAudit.next_audit_date,
                })
                .eq('id', createdAudit.id);

              if (completeError) {
                console.error('Error completing audit:', completeError);
              }
            }

            // Map offline ID to real ID
            if (offlineAuditId) {
              await mapOfflineToRealId(offlineAuditId, createdAudit.id, 'audit');
              await removeOfflineAudit(offlineAuditId);
            }

            await removePendingSync(item.id);
            syncedCount++;
            continue;
          }

          // Handle offline audit item updates (skip - handled with audit sync)
          if (item.type === 'update' && item.table === 'offline_audit_item') {
            await removePendingSync(item.id);
            continue;
          }

          // Handle offline audit completion (skip if already handled)
          if (item.type === 'update' && item.table === 'offline_audit_complete') {
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
      
      if (syncedCount > 0 || photosSyncedCount > 0) {
        const message = [];
        if (syncedCount > 0) {
          message.push(`${syncedCount} ${syncedCount === 1 ? 'auditoria sincronizada' : 'auditorias sincronizadas'}`);
        }
        if (photosSyncedCount > 0) {
          message.push(`${photosSyncedCount} ${photosSyncedCount === 1 ? 'foto enviada' : 'fotos enviadas'}`);
        }
        
        toast({
          title: "Sincronização concluída",
          description: message.join(', ') + '.',
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
