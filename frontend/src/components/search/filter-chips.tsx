import { X } from "lucide-react";
import type { FilterChip } from "@/lib/search-filters";

type FilterChipsProps = {
  chips: FilterChip[];
  onClear: (key: string) => void;
};

export function FilterChips({ chips, onClear }: FilterChipsProps) {
  if (!chips.length) return null;

  return (
    <div className="filter-chips">
      {chips.map((chip) => (
        <button key={chip.key} className="filter-chip" onClick={() => onClear(chip.key)}>
          {chip.label} <X size={12} />
        </button>
      ))}
    </div>
  );
}
