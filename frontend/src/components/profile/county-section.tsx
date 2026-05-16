import { useState } from "react";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountySectionProps {
  currentCounty: string;
  counties: string[];
  onChange: (county: string) => void;
}

export function CountySection({ currentCounty, counties, onChange }: CountySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-gray-400" />
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Județ de reședință</h3>
      </div>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 h-12 rounded-xl border-2 transition-all bg-white",
            isOpen ? "border-gray-900 ring-4 ring-gray-100" : "border-gray-100 hover:border-gray-200"
          )}
        >
          <span className={cn("text-sm font-bold", currentCounty ? "text-gray-900" : "text-gray-400")}>
            {currentCounty || "Selectează județul"}
          </span>
          <ChevronDown
            size={18}
            className={cn("text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div className="absolute z-30 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-200/50 max-h-[300px] overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-2 gap-1">
              {counties.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setIsOpen(false); }}
                  className={cn(
                    "px-3 py-2.5 text-sm font-bold rounded-lg text-left transition-all flex items-center gap-2",
                    currentCounty === c 
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-200" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {currentCounty === c && <Check size={14} className="shrink-0" />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-400 font-medium px-1">
        Folosit pentru a prioritiza legile și reprezentanții locali în feed-ul tău.
      </p>
    </div>
  );
}
