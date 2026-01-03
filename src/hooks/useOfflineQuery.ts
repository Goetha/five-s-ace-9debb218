import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UseOfflineQueryOptions<T> {
  queryKey: string;
  fetchOnline: () => Promise<T>;
  getFromCache: () => Promise<T>;
  saveToCache?: (data: T) => Promise<void>;
  enabled?: boolean;
}

interface UseOfflineQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useOfflineQuery<T>({
  queryKey,
  fetchOnline,
  getFromCache,
  saveToCache,
  enabled = true,
}: UseOfflineQueryOptions<T>): UseOfflineQueryResult<T> {
  const { isOffline } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Use refs to avoid dependency issues
  const fetchOnlineRef = useRef(fetchOnline);
  const getFromCacheRef = useRef(getFromCache);
  const saveToCacheRef = useRef(saveToCache);
  
  useEffect(() => {
    fetchOnlineRef.current = fetchOnline;
    getFromCacheRef.current = getFromCache;
    saveToCacheRef.current = saveToCache;
  }, [fetchOnline, getFromCache, saveToCache]);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If offline, use cache immediately
      if (!navigator.onLine || isOffline) {
        console.log(`[${queryKey}] Offline - fetching from cache`);
        try {
          const cachedData = await getFromCacheRef.current();
          setData(cachedData);
          setIsFromCache(true);
        } catch (cacheError) {
          console.error(`[${queryKey}] Cache fetch failed:`, cacheError);
          setData(null);
          setIsFromCache(false);
        }
        setIsLoading(false);
        return;
      }

      // Try to fetch online with timeout
      try {
        console.log(`[${queryKey}] Online - fetching from server`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000);
        });
        
        const onlineData = await Promise.race([fetchOnlineRef.current(), timeoutPromise]);
        setData(onlineData);
        setIsFromCache(false);

        // Save to cache for offline use
        if (saveToCacheRef.current && onlineData) {
          await saveToCacheRef.current(onlineData);
          console.log(`[${queryKey}] Data cached for offline use`);
        }
      } catch (onlineError) {
        console.warn(`[${queryKey}] Online fetch failed, falling back to cache:`, onlineError);
        // If online fetch fails, try cache as fallback
        try {
          const cachedData = await getFromCacheRef.current();
          if (cachedData && (Array.isArray(cachedData) ? cachedData.length > 0 : true)) {
            setData(cachedData);
            setIsFromCache(true);
          } else {
            throw onlineError;
          }
        } catch (cacheError) {
          console.error(`[${queryKey}] Cache fallback also failed:`, cacheError);
          setError(onlineError instanceof Error ? onlineError : new Error('Failed to fetch data'));
        }
      }
    } catch (err) {
      console.error(`[${queryKey}] Error:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [queryKey, enabled, isOffline]);

  // Fetch only once when enabled changes or on mount
  useEffect(() => {
    if (enabled && !hasFetched) {
      fetchData();
    } else if (!enabled) {
      setIsLoading(false);
      setHasFetched(false);
    }
  }, [enabled, hasFetched, fetchData]);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      console.log(`[${queryKey}] Back online - refetching`);
      fetchData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchData, queryKey]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline: !navigator.onLine || isOffline,
    isFromCache,
    error,
    refetch,
  };
}

// Convenience hook for environments with offline support
export function useOfflineEnvironments(companyId: string | undefined) {
  return useOfflineQuery({
    queryKey: `environments-${companyId}`,
    enabled: !!companyId,
    fetchOnline: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('environments')
        .select('id, name, parent_id, company_id, status')
        .eq('company_id', companyId!)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    getFromCache: async () => {
      try {
        const { getCachedEnvironmentsByCompanyId } = await import('@/lib/offlineStorage');
        const envs = await getCachedEnvironmentsByCompanyId(companyId!);
        return envs.filter(e => e.status === 'active');
      } catch (err) {
        console.error('[useOfflineEnvironments] Cache error:', err);
        return [];
      }
    },
    saveToCache: async (data) => {
      const { cacheEnvironments } = await import('@/lib/offlineStorage');
      await cacheEnvironments(data);
    },
  });
}

// Convenience hook for environment criteria with offline support
export function useOfflineEnvironmentCriteria(environmentId: string | undefined) {
  return useOfflineQuery({
    queryKey: `env-criteria-${environmentId}`,
    enabled: !!environmentId,
    fetchOnline: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get criterion IDs linked to this environment
      const { data: links, error: linksError } = await supabase
        .from('environment_criteria')
        .select('criterion_id')
        .eq('environment_id', environmentId!);
      
      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];
      
      // Get the actual criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from('company_criteria')
        .select('id, name, senso')
        .in('id', links.map(l => l.criterion_id))
        .eq('status', 'active');
      
      if (criteriaError) throw criteriaError;
      return criteria || [];
    },
    getFromCache: async () => {
      try {
        const { getCachedEnvironmentCriteriaByEnvId, getCachedCriteria } = await import('@/lib/offlineStorage');
        
        // Get links from cache
        const links = await getCachedEnvironmentCriteriaByEnvId(environmentId!);
        if (!links || links.length === 0) return [];
        
        // Get criteria from cache
        const allCriteria = await getCachedCriteria();
        const criterionIds = links.map(l => l.criterion_id);
        
        return allCriteria.filter(c => 
          criterionIds.includes(c.id) && c.status === 'active'
        );
      } catch (err) {
        console.error('[useOfflineEnvironmentCriteria] Cache error:', err);
        return [];
      }
    },
    saveToCache: async (data) => {
      const { cacheCriteria } = await import('@/lib/offlineStorage');
      await cacheCriteria(data);
    },
  });
}

// Convenience hook for companies with offline support  
export function useOfflineCompanies(companyIds: string[] | undefined) {
  return useOfflineQuery({
    queryKey: `companies-${companyIds?.join(',')}`,
    enabled: !!companyIds && companyIds.length > 0,
    fetchOnline: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds!);
      
      if (error) throw error;
      return data || [];
    },
    getFromCache: async () => {
      const { getCachedCompanies } = await import('@/lib/offlineStorage');
      const allCompanies = await getCachedCompanies();
      return allCompanies.filter(c => companyIds!.includes(c.id));
    },
    saveToCache: async (data) => {
      const { cacheCompanies } = await import('@/lib/offlineStorage');
      await cacheCompanies(data);
    },
  });
}
