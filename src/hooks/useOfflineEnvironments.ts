import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCachedEnvironmentsByCompanyId,
  getCachedUserCompaniesByUserId,
  getCachedCompanies,
  cacheEnvironments,
  cacheUserCompanies,
  cacheCompanies,
} from '@/lib/offlineStorage';

interface Environment {
  id: string;
  name: string;
  parent_id: string | null;
  company_id: string;
  status: string;
  description?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface UseOfflineEnvironmentsResult {
  companies: Company[];
  allEnvironments: Environment[];
  getRootEnvironment: (companyId: string) => Environment | undefined;
  getSectors: (companyId: string) => Environment[];
  getLocations: (sectorId: string) => Environment[];
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  lastSyncAt: string | null;
  error: string | null;
  refetch: () => void;
}

export function useOfflineEnvironments(userId: string | undefined, targetCompanyId?: string): UseOfflineEnvironmentsResult {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Ref para controlar fetch - NÃO causa re-render
  const lastFetchKeyRef = useRef<string>('');

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data when parameters change
  useEffect(() => {
    console.log('[useOfflineEnvironments] Effect triggered:', {
      userId,
      targetCompanyId,
      refreshTrigger,
      lastKey: lastFetchKeyRef.current
    });

    // Skip if no identifiers
    if (!userId && !targetCompanyId) {
      console.log('[useOfflineEnvironments] No userId or targetCompanyId, skipping');
      setIsLoading(false);
      return;
    }

    const currentKey = `${userId || ''}-${targetCompanyId || ''}-${refreshTrigger}`;
    
    // Skip if already fetched this combination (but allow refetch via refreshTrigger)
    if (lastFetchKeyRef.current === currentKey) {
      console.log('[useOfflineEnvironments] Same key, skipping:', currentKey);
      return;
    }

    console.log('[useOfflineEnvironments] Starting fetch for key:', currentKey);
    let cancelled = false;

    // Timeout de segurança de 10 segundos
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.log('[useOfflineEnvironments] TIMEOUT - forcing loading false');
        setIsLoading(false);
        setError('Tempo limite excedido ao carregar dados');
      }
    }, 10000);

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let companyIds: string[] = [];
        let fetchedCompanies: Company[] = [];

        if (navigator.onLine) {
          // ONLINE MODE
          if (targetCompanyId) {
            companyIds = [targetCompanyId];
            
            const { data: companiesData, error: companiesError } = await supabase
              .from('companies')
              .select('id, name')
              .eq('id', targetCompanyId)
              .eq('status', 'active');

            if (companiesError) throw companiesError;
            fetchedCompanies = companiesData || [];
            
            if (fetchedCompanies.length > 0) {
              await cacheCompanies(fetchedCompanies);
            }
          } else if (userId) {
            const { data: userCompanies, error: ucError } = await supabase
              .from('user_companies')
              .select('id, user_id, company_id')
              .eq('user_id', userId);

            if (ucError) throw ucError;
            
            if (!userCompanies || userCompanies.length === 0) {
              if (!cancelled) {
                setCompanies([]);
                setAllEnvironments([]);
                lastFetchKeyRef.current = currentKey;
              }
              return;
            }

            await cacheUserCompanies(userCompanies);
            companyIds = userCompanies.map(uc => uc.company_id);

            const { data: companiesData, error: companiesError } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', companyIds)
              .eq('status', 'active')
              .order('name');

            if (companiesError) throw companiesError;
            fetchedCompanies = companiesData || [];
            
            if (fetchedCompanies.length > 0) {
              await cacheCompanies(fetchedCompanies);
            }
          }

          // Fetch environments
          if (companyIds.length > 0) {
            console.log('[useOfflineEnvironments] Fetching environments for companies:', companyIds);
            
            const { data: environmentsData, error: envsError } = await supabase
              .from('environments')
              .select('id, name, parent_id, company_id, status, description')
              .in('company_id', companyIds)
              .eq('status', 'active')
              .order('name');

            if (envsError) throw envsError;

            console.log('[useOfflineEnvironments] Environments received:', environmentsData?.length);

            if (environmentsData && !cancelled) {
              await cacheEnvironments(environmentsData);
              setAllEnvironments(environmentsData);
            }
          } else {
            console.log('[useOfflineEnvironments] No companyIds, skipping environments fetch');
          }

          if (!cancelled) {
            console.log('[useOfflineEnvironments] Setting companies:', fetchedCompanies.length);
            setCompanies(fetchedCompanies);
            setIsFromCache(false);
            setLastSyncAt(new Date().toISOString());
            lastFetchKeyRef.current = currentKey;
          }
        } else {
          // OFFLINE MODE - use cache
          if (targetCompanyId) {
            companyIds = [targetCompanyId];
            const cachedCompanies = await getCachedCompanies();
            const targetCompany = cachedCompanies.find(c => c.id === targetCompanyId);
            if (targetCompany && !cancelled) {
              setCompanies([targetCompany]);
            }
          } else if (userId) {
            const cachedUserCompanies = await getCachedUserCompaniesByUserId(userId);
            if (cachedUserCompanies.length === 0) {
              if (!cancelled) {
                setError('Sem dados offline disponíveis');
              }
              return;
            }

            companyIds = cachedUserCompanies.map(uc => uc.company_id);
            const cachedCompanies = await getCachedCompanies();
            const userCompanies = cachedCompanies.filter(c => companyIds.includes(c.id));
            
            if (!cancelled) {
              setCompanies(userCompanies);
            }
          }

          let allEnvs: Environment[] = [];
          for (const companyId of companyIds) {
            const envs = await getCachedEnvironmentsByCompanyId(companyId);
            allEnvs = [...allEnvs, ...envs];
          }

          if (!cancelled) {
            setAllEnvironments(allEnvs);
            setIsFromCache(true);
            lastFetchKeyRef.current = currentKey;
          }
        }
      } catch (e) {
        console.error('[useOfflineEnvironments] Fetch error:', e);
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        console.log('[useOfflineEnvironments] Fetch complete, cancelled:', cancelled);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [userId, targetCompanyId, refreshTrigger]);

  // Refetch function - usa refreshTrigger para forçar re-execução
  const refetch = useCallback(() => {
    lastFetchKeyRef.current = '';
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Hierarchy helpers - Nova estrutura: Empresa > Setor > Local
  const getRootEnvironment = useCallback((companyId: string): Environment | undefined => {
    return allEnvironments.find(
      env => env.company_id === companyId && env.parent_id === null
    );
  }, [allEnvironments]);

  // Setores: filhos diretos da raiz (empresa)
  const getSectors = useCallback((companyId: string): Environment[] => {
    const root = getRootEnvironment(companyId);
    if (!root) return [];
    return allEnvironments.filter(
      env => env.parent_id === root.id && env.status === 'active'
    );
  }, [allEnvironments, getRootEnvironment]);

  // Locais: filhos dos setores
  const getLocations = useCallback((sectorId: string): Environment[] => {
    return allEnvironments.filter(
      env => env.parent_id === sectorId && env.status === 'active'
    );
  }, [allEnvironments]);

  return {
    companies,
    allEnvironments,
    getRootEnvironment,
    getSectors,
    getLocations,
    isLoading,
    isOffline,
    isFromCache,
    lastSyncAt,
    error,
    refetch,
  };
}
