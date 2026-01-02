import { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from './OfflineIndicator';
import { AuthContext } from '@/contexts/AuthContext';
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
  const authContext = useContext(AuthContext);
  
  // Safe fallback if context is not available (during HMR)
  if (!authContext) {
    return <>{children}</>;
  }
  
  return <OfflineSyncProviderInner authContext={authContext}>{children}</OfflineSyncProviderInner>;
}

interface AuthContextValue {
  user: { id: string } | null;
  isOffline: boolean;
  userRole: 'ifa_admin' | 'company_admin' | 'auditor' | null;
}

interface OfflineSyncProviderInnerProps {
  children: React.ReactNode;
  authContext: AuthContextValue;
}

function OfflineSyncProviderInner({ children, authContext }: OfflineSyncProviderInnerProps) {
  const { status, syncPendingChanges } = useOfflineSync();
  const user = authContext.user;
  const isOffline = authContext.isOffline;
  const userRole = authContext.userRole;
  
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
    if (!user || !navigator.onLine || isCaching || !userRole) {
      console.log('🔄 Cache skipped - user:', !!user, 'online:', navigator.onLine, 'caching:', isCaching, 'role:', userRole);
      return;
    }

    setIsCaching(true);
    console.log('🔄 Starting comprehensive offline data cache...');
    console.log('🔄 User role:', userRole);

    try {
      let companyIds: string[] = [];

      // IFA Admin has access to all companies - fetch differently
      if (userRole === 'ifa_admin') {
        console.log('🔄 IFA Admin detected - caching all companies');
        
        // Fetch all active companies for IFA admin
        const { data: allCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .eq('status', 'active');

        if (companiesError) {
          console.error('❌ Error fetching companies:', companiesError);
        } else if (allCompanies && allCompanies.length > 0) {
          await cacheCompanies(allCompanies);
          console.log(`✅ Cached ${allCompanies.length} companies (IFA Admin)`);
          companyIds = allCompanies.map(c => c.id);
        }
      } else {
        // Regular users - fetch via user_companies
        const { data: userCompanies, error: ucError } = await supabase
          .from('user_companies')
          .select('id, user_id, company_id')
          .eq('user_id', user.id);

        if (ucError) {
          console.error('❌ Error fetching user_companies:', ucError);
        } else if (userCompanies && userCompanies.length > 0) {
          await cacheUserCompanies(userCompanies);
          console.log(`✅ Cached ${userCompanies.length} user_companies`);

          companyIds = userCompanies.map(uc => uc.company_id);

          // Cache companies for regular users
          const { data: companies } = await supabase
            .from('companies')
            .select('*')
            .in('id', companyIds);

          if (companies) {
            await cacheCompanies(companies);
            console.log(`✅ Cached ${companies.length} companies`);
          }
        }
      }

      // If we have company IDs, cache related data
      if (companyIds.length > 0) {
        // Cache all environments for companies
        const { data: environments, error: envError } = await supabase
          .from('environments')
          .select('*')
          .in('company_id', companyIds)
          .eq('status', 'active');

        if (envError) {
          console.error('❌ Error fetching environments:', envError);
        } else if (environments && environments.length > 0) {
          await cacheEnvironments(environments);
          console.log(`✅ Cached ${environments.length} environments`);

          // Cache environment_criteria links in batches
          const envIds = environments.map(e => e.id);
          const batchSize = 100;
          
          for (let i = 0; i < envIds.length; i += batchSize) {
            const batch = envIds.slice(i, i + batchSize);
            const { data: envCriteria } = await supabase
              .from('environment_criteria')
              .select('*')
              .in('environment_id', batch);

            if (envCriteria) {
              await cacheEnvironmentCriteria(envCriteria);
            }
          }
          console.log('✅ Cached environment_criteria');
        }

        // Cache company_criteria in batches
        const criteriaBatchSize = 50;
        for (let i = 0; i < companyIds.length; i += criteriaBatchSize) {
          const batch = companyIds.slice(i, i + criteriaBatchSize);
          const { data: criteria } = await supabase
            .from('company_criteria')
            .select('*')
            .in('company_id', batch)
            .eq('status', 'active');

          if (criteria) {
            await cacheCriteria(criteria);
          }
        }
        console.log('✅ Cached company_criteria');

        // Cache audits in batches
        for (let i = 0; i < companyIds.length; i += criteriaBatchSize) {
          const batch = companyIds.slice(i, i + criteriaBatchSize);
          const { data: audits } = await supabase
            .from('audits')
            .select('*')
            .in('company_id', batch);

          if (audits && audits.length > 0) {
            await cacheAudits(audits);
            
            // Cache audit_items for these audits
            const auditIds = audits.map(a => a.id);
            const auditBatchSize = 50;
            for (let j = 0; j < auditIds.length; j += auditBatchSize) {
              const auditBatch = auditIds.slice(j, j + auditBatchSize);
              const { data: auditItems } = await supabase
                .from('audit_items')
                .select('*')
                .in('audit_id', auditBatch);

              if (auditItems) {
                await cacheAuditItems(auditItems);
              }
            }
          }
        }
        console.log('✅ Cached audits and audit_items');
      } else {
        console.warn('⚠️ No companies found to cache');
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
  }, [user, isCaching, userRole]);

  // Cache data when user logs in - with delay to not block UI
  // Only start caching when userRole is available
  useEffect(() => {
    if (user && userRole && navigator.onLine && !isCaching && !hasCachedRef.current) {
      console.log('🔄 Starting cache timer - role:', userRole);
      const timer = setTimeout(() => {
        cacheAllDataForOffline();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, userRole, cacheAllDataForOffline]);

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