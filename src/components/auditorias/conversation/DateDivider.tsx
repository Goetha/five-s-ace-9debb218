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
    <div className="flex justify-center my-3">
      <span className="bg-zinc-800/80 backdrop-blur-sm text-zinc-400 text-[11px] px-3 py-1 rounded-md shadow-sm">
        {getDateLabel()}
      </span>
    </div>
  );
}
