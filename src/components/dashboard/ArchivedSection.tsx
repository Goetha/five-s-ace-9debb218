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
      className="w-full px-3 py-3 flex items-center gap-3 hover:bg-[#202C33] transition-colors text-left border-b border-[#222D34]"
    >
      <div className="w-12 h-12 rounded-full bg-[#00A884] flex items-center justify-center shrink-0">
        <Archive className="h-5 w-5 text-[#111B21]" />
      </div>
      
      <div className="flex-1 flex items-center justify-between">
        <span className="font-medium text-[#E9EDEF]">Arquivadas</span>
        <span className="text-sm text-[#8696A0]">{count}</span>
      </div>
    </button>
  );
}
