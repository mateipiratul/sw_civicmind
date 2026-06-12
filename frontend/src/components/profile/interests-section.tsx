import { useState, useRef } from "react";
import { Sparkles, Check, Send, RotateCcw } from "lucide-react";
import { useInterestAnalysis } from "@/lib/hooks/use-interest-analysis";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Interese civice
          </span>
          {selectedInterests.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
              ({selectedInterests.length})
            </span>
          )}
        </div>

        {/* Manual / AI toggle */}
        <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 3, gap: 2 }}>
          <button
            type="button"
            onClick={() => setMode("manual")}
            style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: mode === "manual" ? "var(--surface)" : "transparent",
              color: mode === "manual" ? "var(--text)" : "var(--text-muted)",
              boxShadow: mode === "manual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => { setMode("ai"); setTimeout(() => textareaRef.current?.focus(), 50); }}
            style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4,
              background: mode === "ai" ? "var(--surface)" : "transparent",
              color: mode === "ai" ? "var(--primary)" : "var(--text-muted)",
              boxShadow: mode === "ai" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            <Sparkles size={11} /> AI
          </button>
        </div>
      </div>

      {/* Manual mode: pill grid */}
      {mode === "manual" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 2 }}>
          {allCategories.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Se încarcă categoriile...</span>
          )}
          {allCategories.map(cat => {
            const active = selectedInterests.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggle(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "var(--primary-text)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; } }}
                onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; } }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* AI mode: input step */}
      {mode === "ai" && aiStep === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic" }}>
            Descrie-te pe scurt și AI-ul îți va sugera interesele.
          </p>
          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiAnalyze(); } }}
              disabled={isAnalyzing}
              placeholder="Ex: Sunt medic în Iași..."
              rows={3}
              style={{
                width: "100%", padding: "12px 48px 12px 14px", fontSize: 13.5,
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                background: "var(--bg)", color: "var(--text)", fontFamily: "inherit",
                outline: "none", resize: "none", lineHeight: 1.55,
                transition: "border-color 0.15s", boxSizing: "border-box",
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--primary)"; (e.target as HTMLTextAreaElement).style.background = "var(--surface)"; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; (e.target as HTMLTextAreaElement).style.background = "var(--bg)"; }}
            />
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={!aiInput.trim() || isAnalyzing}
              style={{
                position: "absolute", right: 10, bottom: 10, width: 32, height: 32,
                borderRadius: 8, border: "none", cursor: aiInput.trim() && !isAnalyzing ? "pointer" : "default",
                background: aiInput.trim() && !isAnalyzing ? "var(--primary)" : "var(--border)",
                color: aiInput.trim() && !isAnalyzing ? "var(--primary-text)" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <Send size={14} />
            </button>
          </div>
          {isAnalyzing && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              <Sparkles size={12} /> Se analizează...
            </div>
          )}
          {error && (
            <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12.5, color: "#dc2626" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* AI mode: confirm step */}
      {mode === "ai" && aiStep === "confirm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={13} style={{ color: "var(--primary-text)" }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, margin: 0 }}>
              <strong>Am extras {aiSuggested.length} categorii</strong> — ajustează și confirmă mai jos.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allCategories.map(cat => {
              const active = selectedInterests.includes(cat);
              const wasSuggested = aiSuggested.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onToggle(cat)}
                  style={{
                    padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                    border: active
                      ? "1.5px solid var(--primary)"
                      : "1.5px solid var(--border)",
                    background: active
                      ? (wasSuggested ? "var(--primary)" : "var(--primary)")
                      : "var(--surface)",
                    color: active ? "var(--primary-text)" : "var(--text-muted)",
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                >
                  {active && <Check size={11} />}
                  {cat}
                  {wasSuggested && !active && <span style={{ fontSize: 9, opacity: 0.5 }}>✦</span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleAiConfirm}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none",
                background: "var(--primary)", color: "var(--primary-text)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Check size={13} /> Confirmă selecția
            </button>
            <button
              type="button"
              onClick={() => { setAiStep("input"); setAiSuggested([]); }}
              style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <RotateCcw size={12} /> Rescrie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
