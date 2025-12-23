import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OfflineAwareSelectProps<T> {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  items: T[];
  isLoading?: boolean;
  isOffline?: boolean;
  isFromCache?: boolean;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  disabled?: boolean;
  className?: string;
}

export function OfflineAwareSelect<T>({
  value,
  onValueChange,
  placeholder = 'Selecione...',
  items,
  isLoading = false,
  isOffline = false,
  isFromCache = false,
  getItemValue,
  getItemLabel,
  disabled = false,
  className = '',
}: OfflineAwareSelectProps<T>) {
  const showOfflineIndicator = isOffline || isFromCache;

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className="relative">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border z-50">
          {showOfflineIndicator && items.length > 0 && (
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-400 border-amber-500/30">
                <WifiOff className="h-2.5 w-2.5" />
                Dados offline
              </Badge>
            </div>
          )}
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              {isOffline ? 'Sem dados offline disponíveis' : 'Nenhum item encontrado'}
            </div>
          ) : (
            items.map((item) => (
              <SelectItem key={getItemValue(item)} value={getItemValue(item)}>
                {getItemLabel(item)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
