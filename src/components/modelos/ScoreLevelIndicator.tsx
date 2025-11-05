import { Badge } from "@/components/ui/badge";

export type ScoreLevel = "low" | "medium" | "high";

interface ScoreLevelIndicatorProps {
  level: ScoreLevel;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const levelConfig = {
  low: {
    emoji: "🔴",
    label: "Não atende o padrão 5S",
    range: "0-4 pontos",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300"
  },
  medium: {
    emoji: "🟡",
    label: "Atende parcialmente ao padrão 5S",
    range: "5-8 pontos",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300"
  },
  high: {
    emoji: "🟢",
    label: "Atende ao padrão 5S",
    range: "9-10 pontos",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-300"
  }
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl"
};

export function ScoreLevelIndicator({ level, showLabel = true, size = "md" }: ScoreLevelIndicatorProps) {
  const config = levelConfig[level];

  if (!showLabel) {
    return (
      <span className={sizeClasses[size]}>
        {config.emoji}
      </span>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${config.textColor} ${config.borderColor} border gap-2`}
    >
      <span className={sizeClasses[size]}>{config.emoji}</span>
      <div className="flex flex-col">
        <span className="font-medium">{config.label}</span>
        <span className="text-xs opacity-75">{config.range}</span>
      </div>
    </Badge>
  );
}

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 9) return "high";
  if (score >= 5) return "medium";
  return "low";
}
