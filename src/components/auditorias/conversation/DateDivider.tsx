import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateDividerProps {
  date: Date;
}

export function DateDivider({ date }: DateDividerProps) {
  const getDateLabel = () => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-center py-3 px-4">
      <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
        {getDateLabel()}
      </span>
    </div>
  );
}
