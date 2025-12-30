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
  getAreas: (companyId: string) => Environment[];
  getEnvironments: (areaId: string) => Environment[];
  getLocations: (environmentId: string) => Environment[];
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  lastSyncAt: string | null;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOfflineEnvironments(userId: string | undefined, targetCompanyId?: string): UseOfflineEnvironmentsResult {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track what we've fetched to avoid re-fetching
  const fetchedKeyRef = useRef<string>('');
  const isFetchingRef = useRef(false);

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

  // Main fetch effect - runs when userId or targetCompanyId changes
  useEffect(() => {
    const fetchKey = `${userId || ''}-${targetCompanyId || ''}`;
    
    // Skip if no identifiers
    if (!userId && !targetCompanyId) {
      setIsLoading(false);
      return;
    }

    // Skip if already fetched for this key
    if (fetchedKeyRef.current === fetchKey) {
      return;
    }

    // Skip if already fetching
    if (isFetchingRef.current) {
      return;
    }

    const doFetch = async () => {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[useOfflineEnvironments] Starting fetch for:', fetchKey);

      try {
        if (navigator.onLine) {
          // ONLINE: Fetch from server
          await fetchFromServer();
        } else {
          // OFFLINE: Use cache
          const hasCache = await fetchFromCache();
          if (!hasCache) {
            setError('Sem dados offline disponíveis');
          }
        }
        fetchedKeyRef.current = fetchKey;
      } catch (e) {
        console.error('[useOfflineEnvironments] Fetch error:', e);
        setError((e as Error).message);
      } finally {
        console.log('[useOfflineEnvironments] Fetch complete');
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    // Helper: fetch from server
    const fetchFromServer = async () => {
      let companyIds: string[] = [];

      if (targetCompanyId) {
        companyIds = [targetCompanyId];
        
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', targetCompanyId)
          .eq('status', 'active');

        if (companiesError) throw companiesError;

        if (companiesData && companiesData.length > 0) {
          await cacheCompanies(companiesData);
          setCompanies(companiesData);
        }
      } else if (userId) {
        const { data: userCompanies, error: ucError } = await supabase
          .from('user_companies')
          .select('id, user_id, company_id')
          .eq('user_id', userId);

        if (ucError) throw ucError;
        
        if (!userCompanies || userCompanies.length === 0) {
          setCompanies([]);
          setAllEnvironments([]);
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

        if (companiesData) {
          await cacheCompanies(companiesData);
          setCompanies(companiesData);
        }
      }

      if (companyIds.length === 0) {
        setAllEnvironments([]);
        return;
      }

      console.log('[useOfflineEnvironments] Fetching environments for:', companyIds);

      const { data: environmentsData, error: envsError } = await supabase
        .from('environments')
        .select('id, name, parent_id, company_id, status, description')
        .in('company_id', companyIds)
        .eq('status', 'active')
        .order('name');

      if (envsError) throw envsError;

      console.log('[useOfflineEnvironments] Environments fetched:', environmentsData?.length);

      if (environmentsData) {
        await cacheEnvironments(environmentsData);
        setAllEnvironments(environmentsData);
      }
      
      setIsFromCache(false);
      setLastSyncAt(new Date().toISOString());
    };

    // Helper: fetch from cache
    const fetchFromCache = async (): Promise<boolean> => {
      try {
        let companyIds: string[] = [];

        if (targetCompanyId) {
          companyIds = [targetCompanyId];
          const cachedCompanies = await getCachedCompanies();
          const targetCompany = cachedCompanies.find(c => c.id === targetCompanyId);
          if (targetCompany) {
            setCompanies([targetCompany]);
          }
        } else if (userId) {
          const cachedUserCompanies = await getCachedUserCompaniesByUserId(userId);
          if (cachedUserCompanies.length === 0) return false;

          companyIds = cachedUserCompanies.map(uc => uc.company_id);
          const cachedCompanies = await getCachedCompanies();
          const userCompanies = cachedCompanies.filter(c => companyIds.includes(c.id));
          
          if (userCompanies.length === 0) return false;
          setCompanies(userCompanies);
        }

        let allEnvs: Environment[] = [];
        for (const companyId of companyIds) {
          const envs = await getCachedEnvironmentsByCompanyId(companyId);
          allEnvs = [...allEnvs, ...envs];
        }

        setAllEnvironments(allEnvs);
        setIsFromCache(true);
        return allEnvs.length > 0 || companyIds.length > 0;
      } catch (e) {
        console.error('[useOfflineEnvironments] Cache error:', e);
        return false;
      }
    };

    doFetch();
  }, [userId, targetCompanyId]);

  // Refetch function
  const refetch = useCallback(async () => {
    fetchedKeyRef.current = ''; // Clear so next effect runs
    isFetchingRef.current = false;
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
