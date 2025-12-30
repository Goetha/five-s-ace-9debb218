import { useState, useEffect, useCallback } from 'react';
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
  getAreas: (companyId: string) => Environment[];
  getEnvironments: (areaId: string) => Environment[];
  getLocations: (environmentId: string) => Environment[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState('');

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
    // Skip if no identifiers
    if (!userId && !targetCompanyId) {
      return;
    }

    const currentKey = `${userId || ''}-${targetCompanyId || ''}`;
    
    // Skip if already fetched this combination
    if (fetchKey === currentKey) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      console.log('[useOfflineEnvironments] Starting fetch', { userId, targetCompanyId });
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
                setIsLoading(false);
                setFetchKey(currentKey);
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
            console.log('[useOfflineEnvironments] Fetching environments for:', companyIds);

            const { data: environmentsData, error: envsError } = await supabase
              .from('environments')
              .select('id, name, parent_id, company_id, status, description')
              .in('company_id', companyIds)
              .eq('status', 'active')
              .order('name');

            if (envsError) throw envsError;

            console.log('[useOfflineEnvironments] Environments fetched:', environmentsData?.length);

            if (environmentsData && !cancelled) {
              await cacheEnvironments(environmentsData);
              setAllEnvironments(environmentsData);
            }
          }

          if (!cancelled) {
            setCompanies(fetchedCompanies);
            setIsFromCache(false);
            setLastSyncAt(new Date().toISOString());
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
                setIsLoading(false);
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
          }
        }

        if (!cancelled) {
          setFetchKey(currentKey);
        }
      } catch (e) {
        console.error('[useOfflineEnvironments] Fetch error:', e);
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          console.log('[useOfflineEnvironments] Fetch complete');
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [userId, targetCompanyId, fetchKey]);

  // Refetch function
  const refetch = useCallback(() => {
    setFetchKey('');
  }, []);

  // Hierarchy helpers
  const getRootEnvironment = useCallback((companyId: string): Environment | undefined => {
    return allEnvironments.find(
      env => env.company_id === companyId && env.parent_id === null
    );
  }, [allEnvironments]);

  const getAreas = useCallback((companyId: string): Environment[] => {
    const root = getRootEnvironment(companyId);
    if (!root) return [];
    return allEnvironments.filter(
      env => env.parent_id === root.id && env.status === 'active'
    );
  }, [allEnvironments, getRootEnvironment]);

  const getEnvironments = useCallback((areaId: string): Environment[] => {
    return allEnvironments.filter(
      env => env.parent_id === areaId && env.status === 'active'
    );
  }, [allEnvironments]);

  const getLocations = useCallback((environmentId: string): Environment[] => {
    return allEnvironments.filter(
      env => env.parent_id === environmentId && env.status === 'active'
    );
  }, [allEnvironments]);

  return {
    companies,
    allEnvironments,
    getRootEnvironment,
    getAreas,
    getEnvironments,
    getLocations,
    isLoading,
    isOffline,
    isFromCache,
    lastSyncAt,
    error,
    refetch,
  };
}
