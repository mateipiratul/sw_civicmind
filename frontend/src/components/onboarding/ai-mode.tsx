import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Check, RotateCcw, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useInterestAnalysis } from "@/lib/hooks/use-interest-analysis";
import { Button } from "@/components/ui/button";

type AiStep = "input" | "confirm";

interface AiModeProps {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
}

export function AiMode({ onComplete, onBack }: AiModeProps) {
  const [step, setStep] = useState<AiStep>("input");
  const [input, setInput] = useState("");
  const { analyze, isAnalyzing, error } = useInterestAnalysis();
  
  const [suggestion, setSuggestion] = useState<{ county: string | null; interests: string[] } | null>(null);
  const [confirmedInterests, setConfirmedInterests] = useState<string[]>([]);
  const [confirmedCounty, setConfirmedCounty] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === "input") {
      textareaRef.current?.focus();
    }
    api.getQuestionnaireMetadata().then(m => setAllCategories(m.impact_categories)).catch(() => {});
  }, [step]);

  const handleSend = async () => {
    const analysis = await analyze(input);
    if (analysis) {
      setSuggestion(analysis);
      setConfirmedCounty(analysis.county);
      setConfirmedInterests(analysis.interests);
      setStep("confirm");
    }
  };

  const toggleInterest = (cat: string) => {
    setConfirmedInterests(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  if (step === "input") {
    return (
      <div className="flex flex-col gap-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Înapoi
        </button>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Descrie-te în câteva cuvinte</h2>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Asistentul AI va extrage automat județul și categoriile de interes din descrierea ta.
            <br />
            <span className="italic opacity-80 text-xs">Ex: „Sunt medic în Iași și mă preocupă sănătatea publică și mediul."</span>
          </p>
        </div>

        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isAnalyzing}
            placeholder="Descrie-ți profesia, orașul sau interesele civice..."
            rows={4}
            className="w-full p-4 pr-14 text-[15px] border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-0 outline-none transition-all resize-none placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAnalyzing}
            className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>

        {isAnalyzing && (
          <div className="flex items-center gap-2.5 text-gray-500 text-sm font-medium animate-pulse">
            <Sparkles size={16} className="text-gray-900" />
            Se analizează descrierea ta...
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => setStep("input")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit font-medium"
      >
        <RotateCcw size={14} /> Rescrie descrierea
      </button>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-4 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="text-[14.5px] text-indigo-950 leading-relaxed">
          <strong className="block mb-1">Am înțeles!</strong>
          {suggestion?.county ? (
            <span>Ești din <strong className="font-bold underline decoration-indigo-300 underline-offset-2">{suggestion.county}</strong> și te interesează </span>
          ) : (
            <span>Te interesează </span>
          )}
          {suggestion?.interests && suggestion.interests.length > 0 ? (
            <strong className="font-bold">{suggestion.interests.join(", ")}.</strong>
          ) : (
            <span>câteva domenii pe care le-am identificat mai jos.</span>
          )}
          <div className="mt-2 text-indigo-700/70 text-xs font-medium">Confirmă sau ajustează selecția înainte de a salva.</div>
        </div>
      </div>

      {confirmedCounty && (
        <div className="flex items-center gap-2.5 px-1">
          <span className="text-sm font-bold text-gray-900">📍 Județ detectat:</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-indigo-100 text-indigo-700 text-[13px] font-bold shadow-sm group">
            {confirmedCounty}
            <button
              onClick={() => setConfirmedCounty(null)}
              className="text-indigo-300 hover:text-red-500 transition-colors"
              title="Elimină județul"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="text-[13.5px] font-bold text-gray-900 block mb-3.5 px-1">
          Domenii de interes <span className="text-gray-400 font-medium">— apasă pentru a modifica</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {allCategories.map(cat => {
            const active = confirmedInterests.includes(cat);
            const wasSuggested = suggestion?.interests?.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleInterest(cat)}
                className={`px-4 py-2 rounded-full border-2 text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm ${
                  active
                    ? wasSuggested
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100"
                      : "bg-gray-900 border-gray-900 text-white shadow-gray-100"
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-300 shadow-none"
                }`}
              >
                {active && <Check size={14} />}
                {cat}
                {wasSuggested && !active && (
                  <span className="text-[10px] opacity-40">✦</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-4 px-1 font-medium">
          ✦ = sugerat de AI &nbsp;|&nbsp; Poți adăuga orice altă categorie
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={() => onComplete(confirmedCounty, confirmedInterests)}
          disabled={confirmedInterests.length === 0 && !confirmedCounty}
          className="flex-1 bg-gray-900 hover:bg-gray-800 h-12 rounded-xl text-white font-bold"
        >
          <Check size={18} />
          Salvează profilul
        </Button>
        <Button
          variant="outline"
          onClick={() => onComplete(null, [])}
          className="px-6 h-12 rounded-xl border-gray-200 text-gray-500 font-bold hover:bg-gray-50"
        >
          Sari peste
        </Button>
      </div>
    </div>
  );
}
