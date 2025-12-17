import { useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from '@/contexts/AuthContext';

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { status, syncPendingChanges, cacheDataForOffline } = useOfflineSync();
  const { activeCompanyId } = useAuth();

  // Cache data when user logs in and has a company
  useEffect(() => {
    if (activeCompanyId && navigator.onLine) {
      cacheDataForOffline(activeCompanyId);
    }
  }, [activeCompanyId, cacheDataForOffline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (status.isOnline && status.pendingCount > 0) {
      syncPendingChanges();
    }
  }, [status.isOnline, status.pendingCount, syncPendingChanges]);

  return (
    <>
      {children}
      <OfflineIndicator
        pendingCount={status.pendingCount}
        isSyncing={status.isSyncing}
        onSync={syncPendingChanges}
      />
    </>
  );
}
