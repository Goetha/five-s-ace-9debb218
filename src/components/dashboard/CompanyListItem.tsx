import { CheckCheck, BellOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
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
    'bg-[#00A884]', // Green
    'bg-[#53BDEB]', // Blue
    'bg-[#FF9500]', // Orange
    'bg-[#FF2D55]', // Pink
    'bg-[#AF52DE]', // Purple
    'bg-[#5856D6]', // Indigo
    'bg-[#FF3B30]', // Red
    'bg-[#34C759]', // Emerald
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
      className="w-full px-3 py-3 flex items-center gap-3 hover:bg-[#202C33] transition-colors text-left active:bg-[#2A3942]"
    >
      {/* Avatar */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-base shrink-0",
        avatarColor
      )}>
        {initials}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#222D34] pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Name row */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="font-medium text-[#E9EDEF] truncate">{name}</span>
            {isFavorite && (
              <Star className="h-3.5 w-3.5 text-[#FFD700] fill-[#FFD700] shrink-0" />
            )}
          </div>
          
          {/* Timestamp + badges */}
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn(
              "text-xs",
              pendingCount > 0 ? "text-[#00A884]" : "text-[#8696A0]"
            )}>
              {timestamp}
            </span>
          </div>
        </div>
        
        {/* Status row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isCompleted && (
              <CheckCheck className="h-4 w-4 text-[#53BDEB] shrink-0" />
            )}
            <span className="text-sm text-[#8696A0] truncate">{statusText}</span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isMuted && (
              <BellOff className="h-3.5 w-3.5 text-[#8696A0]" />
            )}
            {pendingCount > 0 && (
              <span className="bg-[#00A884] text-[#111B21] text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
