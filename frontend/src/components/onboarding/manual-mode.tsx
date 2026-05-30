import { useState, useEffect } from "react";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ManualModeProps {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
}

export function ManualMode({ onComplete, onBack }: ManualModeProps) {
  const [metadata, setMetadata] = useState<{ impact_categories: string[]; counties: string[] } | null>(null);
  const [county, setCounty] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    api.getMetadata().then(setMetadata).catch(() => {});
  }, []);

  const toggle = (cat: string) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Înapoi
      </button>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Selectează preferințele</h2>
        <p className="text-[14px] text-gray-500 leading-relaxed">
          Alege județul tău și domeniile care te interesează pentru a personaliza fluxul de știri.
        </p>
      </div>

      <div>
        <label className="text-[13.5px] font-bold text-gray-900 block mb-2.5 px-1">Județ</label>
        {metadata ? (
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className={`w-full h-11 px-4 text-sm border-2 rounded-xl bg-gray-50 outline-none transition-all ${
              county ? "border-gray-900 text-gray-900" : "border-gray-100 text-gray-400 focus:border-gray-300"
            }`}
          >
            <option value="">— Niciun județ —</option>
            {metadata.counties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <div className="h-11 w-full bg-gray-50 border-2 border-gray-50 rounded-xl animate-pulse" />
        )}
      </div>

      <div>
        <label className="text-[13.5px] font-bold text-gray-900 block mb-3.5 px-1">
          Interese civice <span className="text-gray-400 font-medium">— {selected.length} selectate</span>
        </label>
        {metadata ? (
          <div className="flex flex-wrap gap-2">
            {metadata.impact_categories.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`px-4 py-2 rounded-full border-2 text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm ${
                    active
                      ? "bg-gray-900 border-gray-900 text-white shadow-gray-100"
                      : "bg-white border-gray-100 text-gray-500 hover:border-gray-300 shadow-none"
                  }`}
                >
                  {active && <Check size={14} />}
                  {cat}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 bg-gray-50 rounded-full animate-pulse" />
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={() => onComplete(county || null, selected)}
        className="w-full bg-gray-900 hover:bg-gray-800 h-12 rounded-xl text-white font-bold mt-2"
      >
        Salvează și continuă
        <ArrowRight size={18} />
      </Button>
    </div>
  );
}
