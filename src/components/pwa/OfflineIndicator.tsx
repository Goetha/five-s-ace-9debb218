import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, Database, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface CacheProgress {
  step: string;
  current: number;
  total: number;
  details?: string;
}

interface OfflineIndicatorProps {
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  cacheProgress?: CacheProgress | null;
  isCaching?: boolean;
}

export function OfflineIndicator({ 
  pendingCount, 
  isSyncing, 
  onSync, 
  cacheProgress, 
  isCaching 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSyncing && !isCaching && pendingCount === 0 && isOnline) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, isCaching, pendingCount, isOnline]);

  // Show cache progress indicator
  if (isCaching && cacheProgress) {
    const percentage = cacheProgress.total > 0 
      ? Math.round((cacheProgress.current / cacheProgress.total) * 100) 
      : 0;

    return (
      <div
        className={cn(
          'fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40',
          'animate-in slide-in-from-bottom-4 duration-300'
        )}
      >
        <div className="rounded-lg shadow-lg px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-5 w-5 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Sincronizando dados offline</p>
              <p className="text-xs opacity-90">{cacheProgress.step}</p>
            </div>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="space-y-1">
            <Progress value={percentage} className="h-2 bg-primary-foreground/20" />
            <div className="flex justify-between text-xs opacity-75">
              <span>{cacheProgress.details || `${cacheProgress.current}/${cacheProgress.total}`}</span>
              <span>{percentage}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show the indicator when:
  // - Online with no pending items and no sync success to show
  // - Offline with no pending items (user already knows they're offline from badges)
  if ((isOnline && pendingCount === 0 && !showSyncSuccess) || (!isOnline && pendingCount === 0)) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-40',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div
        className={cn(
          'rounded-lg shadow-lg px-4 py-3 flex items-center gap-3',
          !isOnline && 'bg-amber-500 text-white',
          isOnline && pendingCount > 0 && 'bg-blue-500 text-white',
          showSyncSuccess && 'bg-emerald-500 text-white'
        )}
      >
        {!isOnline ? (
          <>
            <CloudOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Modo Offline</p>
              <p className="text-xs opacity-90">
                {pendingCount > 0
                  ? `${pendingCount} alteração${pendingCount > 1 ? 'ões' : ''} pendente${pendingCount > 1 ? 's' : ''}`
                  : 'Dados salvos localmente'}
              </p>
            </div>
          </>
        ) : showSyncSuccess ? (
          <>
            <Check className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">Sincronizado!</p>
          </>
        ) : (
          <>
            <Cloud className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs opacity-90">Sincronizando...</p>
            </div>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <RefreshCw
                className={cn('h-4 w-4', isSyncing && 'animate-spin')}
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
