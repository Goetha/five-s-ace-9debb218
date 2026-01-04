import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditMessageBubbleProps {
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

export function AuditMessageBubble({
  id,
  locationName,
  environmentName,
  areaName,
  score,
  status,
  startedAt,
  completedAt,
  onClick,
}: AuditMessageBubbleProps) {
  const isCompleted = status === "completed";
  const displayScore = score !== null ? Math.round(score) : null;
  
  // Determinar cor e alinhamento baseado no score
  const getScoreStyle = () => {
    if (!isCompleted || displayScore === null) {
      return {
        bubbleBg: "bg-blue-500/10 border-blue-500/30",
        badgeBg: "bg-blue-500",
        align: "justify-start",
      };
    }
    if (displayScore >= 80) {
      return {
        bubbleBg: "bg-emerald-500/10 border-emerald-500/30",
        badgeBg: "bg-emerald-500",
        align: "justify-end",
      };
    }
    if (displayScore >= 60) {
      return {
        bubbleBg: "bg-amber-500/10 border-amber-500/30",
        badgeBg: "bg-amber-500",
        align: "justify-start",
      };
    }
    return {
      bubbleBg: "bg-red-500/10 border-red-500/30",
      badgeBg: "bg-red-500",
      align: "justify-start",
    };
  };

  const style = getScoreStyle();
  const displayTime = completedAt || startedAt;
  const formattedTime = displayTime
    ? format(new Date(displayTime), "HH:mm", { locale: ptBR })
    : "";

  return (
    <div className={cn("flex px-3", style.align)}>
      <div
        onClick={onClick}
        className={cn(
          "max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl border cursor-pointer transition-all duration-200",
          "hover:shadow-md active:scale-[0.98]",
          style.bubbleBg
        )}
      >
        {/* Localização */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-muted-foreground truncate">
            {areaName} › {environmentName}
          </span>
        </div>

        {/* Nome do Local */}
        <p className="font-medium text-sm text-foreground mb-2 line-clamp-2">
          {locationName}
        </p>

        {/* Score e Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {displayScore !== null ? (
              <span
                className={cn(
                  "text-white text-xs font-bold px-2 py-0.5 rounded-full",
                  style.badgeBg
                )}
              >
                {displayScore}%
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <Clock className="h-3 w-3" />
                Em andamento
              </span>
            )}
          </div>

          {/* Timestamp e Status */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{formattedTime}</span>
            {isCompleted ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
