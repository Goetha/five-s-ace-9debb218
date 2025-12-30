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
  // Data
  companies: Company[];
  allEnvironments: Environment[];
  // Hierarchy getters
  getRootEnvironment: (companyId: string) => Environment | undefined;
  getAreas: (companyId: string) => Environment[];
  getEnvironments: (areaId: string) => Environment[];
  getLocations: (environmentId: string) => Environment[];
  // Status
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  lastSyncAt: string | null;
  error: string | null;
  // Actions
  refetch: () => Promise<void>;
}

export function useOfflineEnvironments(userId: string | undefined): UseOfflineEnvironmentsResult {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const fetchFromCache = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Get user companies from cache
      const cachedUserCompanies = await getCachedUserCompaniesByUserId(userId);
      if (cachedUserCompanies.length === 0) return false;

      const companyIds = cachedUserCompanies.map(uc => uc.company_id);

      // Get companies from cache
      const cachedCompanies = await getCachedCompanies();
      const userCompanies = cachedCompanies.filter(c => companyIds.includes(c.id));
      
      if (userCompanies.length === 0) return false;

      // Get all environments for these companies
      let allEnvs: Environment[] = [];
      for (const companyId of companyIds) {
        const envs = await getCachedEnvironmentsByCompanyId(companyId);
        allEnvs = [...allEnvs, ...envs];
      }

      setCompanies(userCompanies);
      setAllEnvironments(allEnvs);
      setIsFromCache(true);
      return true;
    } catch (e) {
      console.error('Error fetching from cache:', e);
      return false;
    }
  }, [userId]);

  const fetchFromServer = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Fetch user companies
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('id, user_id, company_id')
        .eq('user_id', userId);

      if (ucError) throw ucError;
      if (!userCompanies || userCompanies.length === 0) {
        setCompanies([]);
        setAllEnvironments([]);
        return true;
      }

      // Cache user companies
      await cacheUserCompanies(userCompanies);

      const companyIds = userCompanies.map(uc => uc.company_id);

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)
        .eq('status', 'active')
        .order('name');

      if (companiesError) throw companiesError;

      // Cache companies
      if (companiesData) {
        await cacheCompanies(companiesData);
      }

      // Fetch all environments for these companies
      const { data: environmentsData, error: envsError } = await supabase
        .from('environments')
        .select('id, name, parent_id, company_id, status, description')
        .in('company_id', companyIds)
        .eq('status', 'active')
        .order('name');

      if (envsError) throw envsError;

      // Cache environments
      if (environmentsData) {
        await cacheEnvironments(environmentsData);
      }

      setCompanies(companiesData || []);
      setAllEnvironments(environmentsData || []);
      setIsFromCache(false);
      setLastSyncAt(new Date().toISOString());
      return true;
    } catch (e) {
      console.error('Error fetching from server:', e);
      setError((e as Error).message);
      return false;
    }
  }, [userId]);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (navigator.onLine) {
      const success = await fetchFromServer();
      if (!success) {
        // Fallback to cache if server fails
        await fetchFromCache();
      }
    } else {
      // Offline - use cache
      const hasCache = await fetchFromCache();
      if (!hasCache) {
        setError('Sem dados offline disponíveis');
      }
    }

    setIsLoading(false);
  }, [userId, fetchFromServer, fetchFromCache]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    refetch: fetchData,
  };
}