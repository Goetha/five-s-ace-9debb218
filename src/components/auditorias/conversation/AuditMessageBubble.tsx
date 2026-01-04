import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCheck, Clock } from "lucide-react";
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
  index?: number;
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
  index = 0,
}: AuditMessageBubbleProps) {
  const isCompleted = status === "completed";
  const displayScore = score !== null ? Math.round(score) : null;
  const isGoodScore = displayScore !== null && displayScore >= 80;
  
  // Simplificar: direita se bom (>=80%), esquerda caso contrário
  const alignRight = isCompleted && isGoodScore;

  // Cor do badge baseada no score
  const getScoreBadgeColor = () => {
    if (displayScore === null) return "bg-blue-500";
    if (displayScore >= 80) return "bg-emerald-500";
    if (displayScore >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const displayTime = completedAt || startedAt;
  const formattedTime = displayTime
    ? format(new Date(displayTime), "HH:mm", { locale: ptBR })
    : "";

  return (
    <div 
      className={cn(
        "flex px-3",
        alignRight ? "justify-end" : "justify-start"
      )}
      style={{
        animation: `fadeSlideIn 0.3s ease-out ${index * 50}ms both`
      }}
    >
      <div
        onClick={onClick}
        className={cn(
          "max-w-[85%] sm:max-w-[70%] p-3 rounded-lg cursor-pointer transition-all duration-200",
          "hover:brightness-110 active:scale-[0.98] shadow-sm",
          alignRight 
            ? "bg-emerald-700/90 text-white" 
            : "bg-zinc-800 text-foreground"
        )}
      >
        {/* Localização */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs truncate",
            alignRight ? "text-emerald-100/80" : "text-muted-foreground"
          )}>
            {areaName} › {environmentName}
          </span>
        </div>

        {/* Nome do Local */}
        <p className={cn(
          "font-medium text-sm mb-2 line-clamp-2",
          alignRight ? "text-white" : "text-foreground"
        )}>
          {locationName}
        </p>

        {/* Score e Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {displayScore !== null ? (
              <span
                className={cn(
                  "text-white text-xs font-bold px-2 py-0.5 rounded-full",
                  getScoreBadgeColor()
                )}
              >
                {displayScore}%
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Clock className="h-3 w-3" />
                Em andamento
              </span>
            )}
          </div>

          {/* Timestamp e Status */}
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            alignRight ? "text-emerald-100/70" : "text-muted-foreground"
          )}>
            <span>{formattedTime}</span>
            {isCompleted ? (
              <CheckCheck className={cn(
                "h-3.5 w-3.5",
                isGoodScore ? "text-emerald-300" : "text-muted-foreground"
              )} />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
