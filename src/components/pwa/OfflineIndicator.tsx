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
  // Component disabled - user feedback: notification overlays interfere with app usability
  // The offline status is already visible in context-specific banners (OfflineBanner)
  // and the sync happens automatically when back online
  return null;
}
