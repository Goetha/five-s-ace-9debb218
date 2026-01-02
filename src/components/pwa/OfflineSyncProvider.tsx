import { useEffect, useState, useCallback, useRef } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheAudits,
  cacheCriteria,
  cacheEnvironments,
  cacheCompanies,
  cacheUserCompanies,
  cacheEnvironmentCriteria,
  cacheAuditItems,
  setLastSyncTime,
  getLastSyncTime,
  initDB,
} from '@/lib/offlineStorage';
import { toast } from 'sonner';

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { status, syncPendingChanges } = useOfflineSync();
  const { user, activeCompanyId, linkedCompanies, isOffline } = useAuth();
  const [isCaching, setIsCaching] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cacheProgress, setCacheProgress] = useState<string>('');
  const hasCachedRef = useRef(false);

  // Initialize IndexedDB on mount
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Load last sync time on mount
  useEffect(() => {
    getLastSyncTime().then(setLastSync).catch(console.error);
  }, []);

  // Comprehensive cache function
  const cacheAllDataForOffline = useCallback(async () => {
    if (!user || !navigator.onLine || isCaching) return;

    setIsCaching(true);
    console.log('🔄 Starting comprehensive offline data cache...');

    try {
      // 1. Cache user_companies
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('id, user_id, company_id')
        .eq('user_id', user.id);

      if (userCompanies && userCompanies.length > 0) {
        await cacheUserCompanies(userCompanies);
        console.log(`✅ Cached ${userCompanies.length} user_companies`);

        const companyIds = userCompanies.map(uc => uc.company_id);

        // 2. Cache companies
        const { data: companies } = await supabase
          .from('companies')
          .select('*')
          .in('id', companyIds);

        if (companies) {
          await cacheCompanies(companies);
          console.log(`✅ Cached ${companies.length} companies`);
        }

        // 3. Cache all environments for user's companies
        const { data: environments } = await supabase
          .from('environments')
          .select('*')
          .in('company_id', companyIds)
          .eq('status', 'active');

        if (environments) {
          await cacheEnvironments(environments);
          console.log(`✅ Cached ${environments.length} environments`);

          // 4. Cache environment_criteria links
          const envIds = environments.map(e => e.id);
          if (envIds.length > 0) {
            const { data: envCriteria } = await supabase
              .from('environment_criteria')
              .select('*')
              .in('environment_id', envIds);

            if (envCriteria) {
              await cacheEnvironmentCriteria(envCriteria);
              console.log(`✅ Cached ${envCriteria.length} environment_criteria`);
            }
          }
        }

        // 5. Cache company_criteria for all companies
        const { data: criteria } = await supabase
          .from('company_criteria')
          .select('*')
          .in('company_id', companyIds)
          .eq('status', 'active');

        if (criteria) {
          await cacheCriteria(criteria);
          console.log(`✅ Cached ${criteria.length} company_criteria`);
        }

        // 6. Cache audits for all companies
        const { data: audits } = await supabase
          .from('audits')
          .select('*')
          .in('company_id', companyIds);

        if (audits) {
          await cacheAudits(audits);
          console.log(`✅ Cached ${audits.length} audits`);

          // 7. Cache audit_items for these audits
          const auditIds = audits.map(a => a.id);
          if (auditIds.length > 0) {
            // Fetch in batches if many audits
            const batchSize = 50;
            for (let i = 0; i < auditIds.length; i += batchSize) {
              const batch = auditIds.slice(i, i + batchSize);
              const { data: auditItems } = await supabase
                .from('audit_items')
                .select('*')
                .in('audit_id', batch);

              if (auditItems) {
                await cacheAuditItems(auditItems);
              }
            }
            console.log('✅ Cached audit_items');
          }
        }
      }

      await setLastSyncTime();
      const syncTime = new Date().toISOString();
      setLastSync(syncTime);
      
      // Show success toast only on first cache
      if (!hasCachedRef.current) {
        toast.success('Dados sincronizados para uso offline', {
          description: 'Você pode usar o app mesmo sem internet.',
          duration: 3000,
        });
      }
      hasCachedRef.current = true;
      console.log('✅ Offline cache completed successfully');

    } catch (error) {
      console.error('❌ Error caching offline data:', error);
    } finally {
      setIsCaching(false);
      setCacheProgress('');
    }
  }, [user, isCaching]);

  // Cache data when user logs in - with delay to not block UI
  useEffect(() => {
    if (user && navigator.onLine && !isCaching && !hasCachedRef.current) {
      const timer = setTimeout(() => {
        cacheAllDataForOffline();
      }, 3000); // Increased delay for better UX
      return () => clearTimeout(timer);
    }
  }, [user, cacheAllDataForOffline]);

  // Re-cache when coming back online
  useEffect(() => {
    if (status.isOnline && user && !isCaching) {
      // First sync pending changes, then update cache
      const syncAndCache = async () => {
        if (status.pendingCount > 0) {
          await syncPendingChanges();
        }
        // Update cache with fresh data
        await cacheAllDataForOffline();
      };
      syncAndCache();
    }
  }, [status.isOnline]);

  // Notify user when going offline if cache is available
  useEffect(() => {
    if (isOffline && lastSync) {
      toast.info('Modo offline ativado', {
        description: 'Você pode continuar trabalhando. Os dados serão sincronizados quando voltar online.',
        duration: 5000,
      });
    }
  }, [isOffline, lastSync]);

  return (
    <>
      {children}
      <OfflineIndicator
        pendingCount={status.pendingCount}
        isSyncing={status.isSyncing || isCaching}
        onSync={syncPendingChanges}
      />
    </>
  );
}