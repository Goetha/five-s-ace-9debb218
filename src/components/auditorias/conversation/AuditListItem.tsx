import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCheck, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditListItemProps {
  id: string;
  locationName: string;
  environmentName: string;
  areaName: string;
  score: number | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  onClick: () => void;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "bg-blue-500";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreIcon(score: number | null): string {
  if (score === null) return "🔄";
  if (score >= 80) return "✓";
  if (score >= 60) return "!";
  return "✕";
}

function formatTimestamp(date: string | null): string {
  if (!date) return "";

  const d = new Date(date);

  if (isToday(d)) {
    return format(d, "HH:mm");
  }

  if (isYesterday(d)) {
    return "Ontem";
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d > weekAgo) {
    return format(d, "EEE", { locale: ptBR });
  }

  return format(d, "dd/MM");
}

function getStatusText(score: number | null): string {
  if (score === null) return "Em andamento";
  const rounded = Math.round(score);
  if (rounded >= 80) return `${rounded}% - Excelente`;
  if (rounded >= 60) return `${rounded}% - Regular`;
  return `${rounded}% - Crítico`;
}

export function AuditListItem({
  id,
  locationName,
  environmentName,
  areaName,
  score,
  status,
  startedAt,
  completedAt,
  onClick,
}: AuditListItemProps) {
  const isCompleted = status === "completed";
  const displayScore = score !== null ? Math.round(score) : null;
  const isGoodScore = displayScore !== null && displayScore >= 80;
  const displayTime = completedAt || startedAt;
  const timestamp = formatTimestamp(displayTime);
  const statusText = getStatusText(score);
  const scoreColor = getScoreColor(score);

  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted/50 transition-colors text-left active:bg-muted border-b border-border"
    >
      {/* Avatar com cor do score */}
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0",
          scoreColor
        )}
      >
        {displayScore !== null ? (
          <span>{displayScore}%</span>
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Location name */}
          <span className="font-medium text-sm text-foreground truncate">
            {locationName}
          </span>

          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground shrink-0">
            {timestamp}
          </span>
        </div>

        {/* Path + Status row */}
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {areaName} › {environmentName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isCompleted && (
              <CheckCheck
                className={cn(
                  "h-3.5 w-3.5",
                  isGoodScore ? "text-emerald-500" : "text-muted-foreground"
                )}
              />
            )}
            {!isCompleted && (
              <span className="text-[10px] text-blue-400 font-medium">
                Em andamento
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
