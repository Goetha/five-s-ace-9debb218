import { WifiOff, RefreshCw, Clock, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OfflineBannerProps {
  isOffline: boolean;
  isFromCache: boolean;
  lastSyncAt: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function OfflineBanner({ 
  isOffline, 
  isFromCache, 
  lastSyncAt, 
  onRefresh,
  isRefreshing = false 
}: OfflineBannerProps) {
  // Only show if offline or showing cached data
  if (!isOffline && !isFromCache) {
    return null;
  }

  const formattedLastSync = lastSyncAt 
    ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: ptBR })
    : null;

  if (isOffline) {
    return (
      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-500/20">
            <WifiOff className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-200">Modo Offline</p>
            <p className="text-xs text-amber-300/70">
              Você está sem conexão. Mostrando dados salvos localmente.
              {formattedLastSync && (
                <span className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Última sincronização: {formattedLastSync}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isFromCache && !isOffline) {
    return (
      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-500/20">
            <Cloud className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-200">Dados do cache</p>
            <p className="text-xs text-blue-300/70">
              Mostrando dados salvos localmente enquanto sincroniza.
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        )}
      </div>
    );
  }

  return null;
}
