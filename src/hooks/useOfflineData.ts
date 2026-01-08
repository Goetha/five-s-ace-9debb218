import { useState, useEffect, useCallback, useRef } from 'react';

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
  const fetchedRef = useRef(false);
  const fetchOnlineRef = useRef(fetchOnline);

  // Keep fetchOnline ref updated
  useEffect(() => {
    fetchOnlineRef.current = fetchOnline;
  }, [fetchOnline]);

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

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const onlineData = await fetchOnlineRef.current();
      setData(onlineData);
      setIsFromCache(false);
      setLastSyncAtState(new Date().toISOString());
    } catch (e) {
      console.warn(`Online fetch failed for ${cacheKey}, trying cache:`, e);
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, enabled]);

  // Initial fetch - only once
  useEffect(() => {
    if (!fetchedRef.current && enabled) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData, enabled]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline,
    isFromCache,
    lastSyncAt,
    error,
    refetch,
  };
}
