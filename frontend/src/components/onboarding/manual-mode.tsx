import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ManualModeProps {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
}

export function ManualMode({ onComplete, onBack }: ManualModeProps) {
  const [metadata, setMetadata] = useState<{ impact_categories: string[]; counties: string[] } | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [county, setCounty] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setMetadataError(false);

    api.getQuestionnaireMetadata()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadataError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const toggle = (cat: string) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const isLoading = !metadata && !metadataError;

  return (
    <div className="flex flex-col gap-7">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 rounded-full px-1 text-sm font-bold text-gray-500 transition-colors hover:text-gray-950"
      >
        <ArrowLeft size={15} /> Înapoi
      </button>

      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-[-0.04em] text-gray-950">Selectează preferințele</h2>
        <p className="max-w-2xl text-[15px] leading-7 text-gray-500">
          Alege județul tău și domeniile civice care te interesează. Folosim selecția doar ca să prioritizăm feed-ul.
        </p>
      </div>

      {metadataError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-black">Nu am putut încărca opțiunile.</div>
          <p className="mt-1 leading-6 text-red-600">
            Verifică dacă ești autentificat și încearcă din nou.
          </p>
          <button
            type="button"
            onClick={() => {
              setMetadata(null);
              setReloadKey((key) => key + 1);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[13px] font-black text-red-700 shadow-sm"
          >
            <RefreshCcw size={14} />
            Reîncarcă
          </button>
        </div>
      )}

      <div>
        <label className="mb-2.5 block px-1 text-[13.5px] font-black text-gray-950">Județ</label>
        {isLoading ? (
          <div className="h-12 w-full animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
        ) : metadata ? (
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className={`h-12 w-full rounded-2xl border-2 bg-white px-4 text-sm font-bold outline-none transition-all ${
              county ? "border-gray-950 text-gray-950" : "border-gray-100 text-gray-400 focus:border-gray-300"
            }`}
          >
            <option value="">Niciun județ</option>
            {metadata.counties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : null}
      </div>

      <div>
        <label className="mb-3.5 block px-1 text-[13.5px] font-black text-gray-950">
          Interese civice <span className="font-bold text-gray-400">- {selected.length} selectate</span>
        </label>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-full bg-gray-50" />
            ))}
          </div>
        ) : metadata ? (
          <div className="flex flex-wrap gap-2">
            {metadata.impact_categories.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[13px] font-black shadow-sm transition-all ${
                    active
                      ? "border-gray-950 bg-gray-950 text-white shadow-gray-100"
                      : "border-gray-100 bg-white text-gray-500 shadow-none hover:border-gray-300 hover:text-gray-950"
                  }`}
                >
                  {active && <Check size={14} />}
                  {cat}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <Button
        onClick={() => onComplete(county || null, selected)}
        disabled={!metadata || metadataError}
        className="mt-2 h-12 w-full rounded-2xl bg-gray-950 font-black text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        Salvează și continuă
        <ArrowRight size={18} />
      </Button>
    </div>
  );
}
