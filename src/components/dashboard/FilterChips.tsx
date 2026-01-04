import { cn } from "@/lib/utils";

export type FilterType = 'all' | 'pending' | 'favorites' | 'with-pa';

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts?: {
    all: number;
    pending: number;
    favorites: number;
    withPa: number;
  };
}

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'favorites', label: 'Favoritas' },
  { key: 'with-pa', label: 'Com PA' },
];

export function FilterChips({ activeFilter, onFilterChange, counts }: FilterChipsProps) {
  return (
    <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            activeFilter === filter.key
              ? "bg-[#00A884] text-[#111B21]"
              : "bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942]"
          )}
        >
          {filter.label}
          {counts && filter.key !== 'all' && (
            <span className="ml-1 text-xs opacity-80">
              ({filter.key === 'pending' ? counts.pending : filter.key === 'favorites' ? counts.favorites : counts.withPa})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
