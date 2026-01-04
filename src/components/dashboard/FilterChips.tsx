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
    <div className="px-3 sm:px-6 lg:px-8 py-2">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-2 min-w-max pr-3">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border flex-shrink-0",
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
              )}
            >
              {filter.label}
              {counts && (
                <span className="ml-1 text-xs opacity-80">
                  ({filter.key === 'all' ? counts.all : filter.key === 'pending' ? counts.pending : filter.key === 'favorites' ? counts.favorites : counts.withPa})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
