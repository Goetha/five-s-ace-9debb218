import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateDividerProps {
  date: Date;
}

export function DateDivider({ date }: DateDividerProps) {
  const getDateLabel = () => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex justify-center my-4">
      <span className="bg-muted/80 text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
        {getDateLabel()}
      </span>
    </div>
  );
}
