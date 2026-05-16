import { useState, useRef } from "react";
import { Sparkles, Check, Send, RotateCcw, X } from "lucide-react";
import { useInterestAnalysis } from "@/lib/hooks/use-interest-analysis";
import { cn } from "@/lib/utils";

interface InterestsSectionProps {
  selectedInterests: string[];
  allCategories: string[];
  onToggle: (interest: string) => void;
  onAiComplete: (county: string | null, interests: string[]) => void;
}

export function InterestsSection({
  selectedInterests,
  allCategories,
  onToggle,
  onAiComplete,
}: InterestsSectionProps) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [aiStep, setAiStep] = useState<"input" | "confirm">("input");
  const [aiInput, setAiInput] = useState("");
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const { analyze, isAnalyzing, error } = useInterestAnalysis();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAiAnalyze = async () => {
    const result = await analyze(aiInput);
    if (result) {
      setAiSuggested(result.interests);
      onAiComplete(result.county, result.interests);
      setAiStep("confirm");
    }
  };

  const handleAiConfirm = () => {
    setAiStep("input");
    setAiInput("");
    setAiSuggested([]);
    setMode("manual");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Interese civice</h3>
          {selectedInterests.length > 0 && (
            <span className="text-[11px] font-bold text-gray-400">({selectedInterests.length})</span>
          )}
        </div>

        <div className="flex bg-gray-50 border border-gray-100 rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
              mode === "manual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ai");
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5",
              mode === "ai" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-indigo-400"
            )}
          >
            <Sparkles size={11} /> AI
          </button>
        </div>
      </div>

      {mode === "manual" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {allCategories.map(cat => {
            const active = selectedInterests.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggle(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all border-2",
                  active
                    ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-100"
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {mode === "ai" && aiStep === "input" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[13px] text-gray-500 leading-relaxed italic">
            Descrie-te pe scurt și AI-ul îți va sugera interesele.
          </p>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiAnalyze(); } }}
              disabled={isAnalyzing}
              placeholder="Ex: Sunt medic în Iași..."
              rows={3}
              className="w-full p-4 pr-12 text-sm border-2 border-gray-50 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-100 focus:ring-0 outline-none transition-all resize-none placeholder:text-gray-300"
            />
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={!aiInput.trim() || isAnalyzing}
              className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-lg bg-indigo-600 text-white disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Send size={14} />
            </button>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold animate-pulse">
              <Sparkles size={12} /> Se analizează...
            </div>
          )}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-[12px] text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>
      )}

      {mode === "ai" && aiStep === "confirm" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 shadow-sm shadow-indigo-50/50">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
              <Sparkles size={13} className="text-white" />
            </div>
            <p className="text-[13px] text-indigo-950 leading-relaxed">
              <strong className="font-bold">Am extras {aiSuggested.length} categorii</strong> — marcate cu <span className="opacity-50 text-[10px]">✦</span>. Ajustează și confirmă mai jos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {allCategories.map(cat => {
              const active = selectedInterests.includes(cat);
              const wasSuggested = aiSuggested.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onToggle(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border-2 flex items-center gap-1.5",
                    active
                      ? wasSuggested
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-100"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  {active && <Check size={12} />}
                  {cat}
                  {wasSuggested && !active && <span className="text-[9px] opacity-40">✦</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAiConfirm}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Check size={14} /> Confirmă selecția
            </button>
            <button
              type="button"
              onClick={() => { setAiStep("input"); setAiSuggested([]); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={12} /> Rescrie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
