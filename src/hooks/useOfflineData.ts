import { useState, useEffect, useCallback } from 'react';
import { 
  getCachedCompanies, 
  getCachedCriteria, 
  getCachedMasterCriteria,
  getCachedMasterModels,
  getCachedEnvironments,
  getCachedAudits,
  cacheCompanies,
  cacheCriteria,
  cacheMasterCriteria,
  cacheMasterModels,
  cacheEnvironments,
  cacheAudits,
  getLastSyncTime,
  setLastSyncTime,
  initDB
} from '@/lib/offlineStorage';

type CacheType = 'companies' | 'criteria' | 'master_criteria' | 'master_models' | 'environments' | 'audits';

interface UseOfflineDataOptions<T> {
  cacheKey: CacheType;
  fetchOnline: () => Promise<T[]>;
  enabled?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T[];
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  lastSyncAt: string | null;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Map cache types to their storage functions
const cacheGetters: Record<CacheType, () => Promise<any[]>> = {
  companies: getCachedCompanies,
  criteria: getCachedCriteria,
  master_criteria: getCachedMasterCriteria,
  master_models: getCachedMasterModels,
  environments: getCachedEnvironments,
  audits: getCachedAudits,
};

const cacheSetters: Record<CacheType, (data: any[]) => Promise<void>> = {
  companies: cacheCompanies,
  criteria: cacheCriteria,
  master_criteria: cacheMasterCriteria,
  master_models: cacheMasterModels,
  environments: cacheEnvironments,
  audits: cacheAudits,
};

export function useOfflineData<T>({ 
  cacheKey, 
  fetchOnline, 
  enabled = true 
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

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

  // Load last sync time
  useEffect(() => {
    const loadLastSync = async () => {
      try {
        await initDB();
        const syncTime = await getLastSyncTime();
        setLastSyncAtState(syncTime);
      } catch (e) {
        console.error('Error loading last sync time:', e);
      }
    };
    loadLastSync();
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await initDB();

      if (navigator.onLine) {
        // Online: try to fetch from server
        try {
          const onlineData = await fetchOnline();
          setData(onlineData);
          setIsFromCache(false);

          // Cache the data
          const cacheSetter = cacheSetters[cacheKey];
          if (cacheSetter && onlineData.length > 0) {
            await cacheSetter(onlineData);
            await setLastSyncTime();
            const newSyncTime = await getLastSyncTime();
            setLastSyncAtState(newSyncTime);
          }
        } catch (onlineError) {
          console.warn(`Online fetch failed for ${cacheKey}, trying cache:`, onlineError);
          // Fallback to cache
          const cacheGetter = cacheGetters[cacheKey];
          const cachedData = await cacheGetter();
          if (cachedData && cachedData.length > 0) {
            setData(cachedData as T[]);
            setIsFromCache(true);
          } else {
            throw onlineError;
          }
        }
      } else {
        // Offline: load from cache
        const cacheGetter = cacheGetters[cacheKey];
        const cachedData = await cacheGetter();
        setData(cachedData as T[]);
        setIsFromCache(true);

        if (cachedData.length === 0) {
          console.warn(`No cached data available for ${cacheKey}`);
        }
      }
    } catch (e) {
      console.error(`Error fetching data for ${cacheKey}:`, e);
      setError(e as Error);
      
      // Last resort: try cache
      try {
        const cacheGetter = cacheGetters[cacheKey];
        const cachedData = await cacheGetter();
        if (cachedData && cachedData.length > 0) {
          setData(cachedData as T[]);
          setIsFromCache(true);
        }
      } catch (cacheError) {
        console.error('Cache fallback also failed:', cacheError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetchOnline, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (!isOffline && isFromCache) {
      fetchData();
    }
  }, [isOffline, isFromCache, fetchData]);

  return {
    data,
    isLoading,
    isOffline,
    isFromCache,
    lastSyncAt,
    error,
    refetch: fetchData,
  };
}
