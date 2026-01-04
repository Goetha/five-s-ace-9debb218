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
    <div className="flex items-center justify-center py-2 px-3">
      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
        {getDateLabel()}
      </span>
    </div>
  );
}
