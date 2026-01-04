import { CheckCheck, BellOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompanyListItemProps {
  id: string;
  name: string;
  lastAuditScore?: number | null;
  lastAuditDate?: string | null;
  pendingCount?: number;
  isFavorite?: boolean;
  isMuted?: boolean;
  isCompleted?: boolean;
  status: string;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-sky-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function formatTimestamp(date: string | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isToday(d)) {
    return format(d, 'HH:mm');
  }
  
  if (isYesterday(d)) {
    return 'Ontem';
  }
  
  // Within last week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d > weekAgo) {
    return format(d, 'EEE', { locale: ptBR });
  }
  
  return format(d, 'dd/MM');
}

function getStatusText(score: number | null | undefined, status: string): string {
  if (status === 'inactive') {
    return 'Empresa inativa';
  }
  
  if (score === null || score === undefined) {
    return 'Sem auditorias realizadas';
  }
  
  if (score >= 9) return `Score: ${score.toFixed(1)} - Excelente`;
  if (score >= 7) return `Score: ${score.toFixed(1)} - Bom`;
  if (score >= 5) return `Score: ${score.toFixed(1)} - Regular`;
  return `Score: ${score.toFixed(1)} - Melhorar`;
}

export function CompanyListItem({
  id,
  name,
  lastAuditScore,
  lastAuditDate,
  pendingCount = 0,
  isFavorite = false,
  isMuted = false,
  isCompleted = false,
  status,
  onClick,
}: CompanyListItemProps) {
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const timestamp = formatTimestamp(lastAuditDate);
  const statusText = getStatusText(lastAuditScore, status);

  return (
    <button
      onClick={onClick}
      className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left active:bg-muted border-b border-border"
    >
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base shrink-0",
        avatarColor
      )}>
        {initials}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Name row */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="font-medium text-foreground truncate">{name}</span>
            {isFavorite && (
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
            )}
          </div>
          
          {/* Timestamp + badges */}
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn(
              "text-xs",
              pendingCount > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {timestamp}
            </span>
          </div>
        </div>
        
        {/* Status row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isCompleted && (
              <CheckCheck className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="text-sm text-muted-foreground truncate">{statusText}</span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isMuted && (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
