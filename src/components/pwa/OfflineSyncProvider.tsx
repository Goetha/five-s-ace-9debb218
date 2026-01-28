import { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator, CacheProgress } from './OfflineIndicator';
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
  cacheMasterCriteria,
  cacheMasterModels,
  cacheAuditors,
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
  const [cacheProgress, setCacheProgress] = useState<CacheProgress | null>(null);
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
      const totalSteps = 7; // Added one more step for IFA admin data
      let currentStep = 0;

      // Step 1: Fetch companies
      setCacheProgress({ step: 'Buscando empresas...', current: ++currentStep, total: totalSteps });

      if (userRole === 'ifa_admin') {
        console.log('🔄 IFA Admin detected - caching all companies');
        
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
          setCacheProgress({ 
            step: 'Empresas sincronizadas', 
            current: currentStep, 
            total: totalSteps,
            details: `${allCompanies.length} empresas`
          });
        }
      } else {
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

          const { data: companies } = await supabase
            .from('companies')
            .select('*')
            .in('id', companyIds);

          if (companies) {
            await cacheCompanies(companies);
            console.log(`✅ Cached ${companies.length} companies`);
            setCacheProgress({ 
              step: 'Empresas sincronizadas', 
              current: currentStep, 
              total: totalSteps,
              details: `${companies.length} empresas`
            });
          }
        }
      }

      if (companyIds.length > 0) {
        // Step 2: Fetch environments
        setCacheProgress({ step: 'Sincronizando ambientes...', current: ++currentStep, total: totalSteps });
        
        const { data: environments, error: envError } = await supabase
          .from('environments')
          .select('*')
          .in('company_id', companyIds)
          .eq('status', 'active');

        let envCount = 0;
        if (envError) {
          console.error('❌ Error fetching environments:', envError);
        } else if (environments && environments.length > 0) {
          await cacheEnvironments(environments);
          envCount = environments.length;
          console.log(`✅ Cached ${environments.length} environments`);

          // Cache environment_criteria links
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
        
        setCacheProgress({ 
          step: 'Ambientes sincronizados', 
          current: currentStep, 
          total: totalSteps,
          details: `${envCount} ambientes`
        });

        // Step 3: Cache criteria
        setCacheProgress({ step: 'Sincronizando critérios...', current: ++currentStep, total: totalSteps });
        
        let criteriaCount = 0;
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
            criteriaCount += criteria.length;
          }
        }
        console.log('✅ Cached company_criteria');
        
        setCacheProgress({ 
          step: 'Critérios sincronizados', 
          current: currentStep, 
          total: totalSteps,
          details: `${criteriaCount} critérios`
        });

        // Step 4: Cache audits
        setCacheProgress({ step: 'Sincronizando auditorias...', current: ++currentStep, total: totalSteps });
        
        let auditCount = 0;
        let auditItemCount = 0;
        
        for (let i = 0; i < companyIds.length; i += criteriaBatchSize) {
          const batch = companyIds.slice(i, i + criteriaBatchSize);
          const { data: audits } = await supabase
            .from('audits')
            .select('*')
            .in('company_id', batch);

          if (audits && audits.length > 0) {
            await cacheAudits(audits);
            auditCount += audits.length;
            
            // Cache audit_items
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
                auditItemCount += auditItems.length;
              }
            }
          }
          
          // Update progress during audit sync
          setCacheProgress({ 
            step: 'Sincronizando auditorias...', 
            current: currentStep, 
            total: totalSteps,
            details: `${auditCount} auditorias`
          });
        }
        console.log('✅ Cached audits and audit_items');
        
        setCacheProgress({ 
          step: 'Auditorias sincronizadas', 
          current: currentStep, 
          total: totalSteps,
          details: `${auditCount} auditorias, ${auditItemCount} itens`
        });

      } else {
        console.warn('⚠️ No companies found to cache');
      }

      // Step 5: Cache IFA Admin specific data
      setCacheProgress({ step: 'Sincronizando dados adicionais...', current: ++currentStep, total: totalSteps });
      
      if (userRole === 'ifa_admin') {
        try {
          // Cache master criteria
          const { data: masterCriteria } = await supabase
            .from('master_criteria')
            .select('*');
          if (masterCriteria) {
            await cacheMasterCriteria(masterCriteria);
            console.log(`✅ Cached ${masterCriteria.length} master_criteria`);
          }

          // Cache master models with criteria counts
          const { data: masterModels } = await supabase
            .from('master_models')
            .select('*');
          
          if (masterModels) {
            const { data: modelCriteria } = await supabase
              .from('master_model_criteria')
              .select('model_id, criterion_id');
            
            const { data: companyModels } = await supabase
              .from('company_models')
              .select('model_id, status')
              .eq('status', 'active');
            
            const enrichedModels = masterModels.map(model => {
              const criteriaIds = (modelCriteria || [])
                .filter(mc => mc.model_id === model.id)
                .map(mc => mc.criterion_id);
              const companiesUsing = (companyModels || []).filter(cm => cm.model_id === model.id).length;
              return {
                ...model,
                total_criteria: criteriaIds.length,
                companies_using: companiesUsing,
                criteria_ids: criteriaIds,
              };
            });
            
            await cacheMasterModels(enrichedModels);
            console.log(`✅ Cached ${masterModels.length} master_models`);
          }

          // Cache auditors
          try {
            const { data: auditorsData } = await supabase.functions.invoke('list-all-auditors');
            if (auditorsData?.auditors) {
              await cacheAuditors(auditorsData.auditors);
              console.log(`✅ Cached ${auditorsData.auditors.length} auditors`);
            }
          } catch (auditorError) {
            console.warn('⚠️ Could not cache auditors:', auditorError);
          }
        } catch (ifaError) {
          console.error('❌ Error caching IFA admin data:', ifaError);
        }
      }

      // Step 6: Finalize

      await setLastSyncTime();
      const syncTime = new Date().toISOString();
      setLastSync(syncTime);
      
      // Step 6: Complete
      setCacheProgress({ step: 'Concluído!', current: totalSteps, total: totalSteps });

      // Show success toast only on first cache
      if (!hasCachedRef.current) {
        toast.success('Dados sincronizados para uso offline', {
          description: 'Você pode usar o app mesmo sem internet.',
          duration: 3000,
        });
      }
      hasCachedRef.current = true;
      console.log('✅ Offline cache completed successfully');

      // Clear progress after a short delay
      setTimeout(() => setCacheProgress(null), 1500);

    } catch (error) {
      console.error('❌ Error caching offline data:', error);
      setCacheProgress(null);
    } finally {
      setIsCaching(false);
    }
  }, [user, isCaching, userRole]);

  // Cache data when user logs in
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
      const syncAndCache = async () => {
        if (status.pendingCount > 0) {
          await syncPendingChanges();
        }
        await cacheAllDataForOffline();
      };
      syncAndCache();
    }
  }, [status.isOnline]);

  // Notify user when going offline
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
        isSyncing={status.isSyncing}
        onSync={syncPendingChanges}
        cacheProgress={cacheProgress}
        isCaching={isCaching}
      />
    </>
  );
}
