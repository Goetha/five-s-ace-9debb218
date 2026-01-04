import { Archive } from "lucide-react";

interface ArchivedSectionProps {
  count: number;
  onClick: () => void;
}

export function ArchivedSection({ count, onClick }: ArchivedSectionProps) {
  if (count === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Archive className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 flex items-center justify-between">
        <span className="font-medium text-foreground">Arquivadas</span>
        <span className="text-sm text-muted-foreground">{count}</span>
      </div>
    </button>
  );
}
