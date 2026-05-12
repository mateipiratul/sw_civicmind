import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Send, Sparkles, CheckSquare, ArrowRight, X, Check, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Mode = "choose" | "ai" | "manual" | "done";
type AiStep = "input" | "confirm";

interface AiSuggestion {
  county: string | null;
  interests: string[];
}

// ─── AI Chat Mode ──────────────────────────────────────────────────────────────

function AiMode({
  onComplete,
  onBack,
}: {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<AiStep>("input");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  // editable confirmed interests (user can toggle after AI suggests)
  const [confirmedInterests, setConfirmedInterests] = useState<string[]>([]);
  const [confirmedCounty, setConfirmedCounty] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    api.getMetadata().then(m => setAllCategories(m.impact_categories)).catch(() => {});
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await api.getMetadata();
      const analysis = await api.analyzeOnboardingProfile(
        text,
        metadata.counties,
        metadata.impact_categories
      );
      setSuggestion(analysis);
      setConfirmedCounty(analysis.county ?? null);
      setConfirmedInterests(analysis.interests ?? []);
      setStep("confirm");
    } catch {
      setError("Nu am putut analiza descrierea. Încearcă din nou.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (cat: string) => {
    setConfirmedInterests(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // ── Input step ────────────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, textAlign: "left", padding: 0 }}
        >
          ← Înapoi
        </button>

        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>Descrie-te în câteva cuvinte</h2>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            Asistentul AI va extrage automat județul și categoriile de interes din descrierea ta.
            <br />
            <em>Ex: „Sunt medic în Iași și mă preocupă sănătatea publică și mediul."</em>
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isLoading}
            placeholder="Descrie-ți profesia, orașul sau interesele civice..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 48px 12px 14px",
              fontSize: 14,
              border: "1.5px solid var(--border-input)",
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--text)",
              fontFamily: "var(--font)",
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              width: 34,
              height: 34,
              borderRadius: 8,
              background: !input.trim() || isLoading ? "var(--border-input)" : "var(--primary)",
              border: "none",
              cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
              color: "var(--primary-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <Send size={15} />
          </button>
        </div>

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13.5 }}>
            <Sparkles size={14} />
            Se analizează descrierea ta...
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Confirm step ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <button
        onClick={() => setStep("input")}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
      >
        <RotateCcw size={12} /> Rescrie descrierea
      </button>

      {/* AI summary message */}
      <div style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1px solid #c4b5fd", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <Sparkles size={14} color="white" />
        </div>
        <div style={{ fontSize: 13.5, color: "#4c1d95", lineHeight: 1.6 }}>
          <strong>Am înțeles!</strong>{" "}
          {suggestion?.county
            ? <>Ești din <strong>{suggestion.county}</strong> și te interesează{" "}</>
            : "Te interesează "}
          {suggestion?.interests && suggestion.interests.length > 0
            ? <><strong>{suggestion.interests.join(", ")}</strong>.</>
            : "câteva domenii pe care le-am identificat mai jos."}
          <br />
          <span style={{ color: "#7c3aed" }}>Confirmă sau ajustează selecția înainte de a salva.</span>
        </div>
      </div>

      {/* County display */}
      {confirmedCounty && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>📍 Județ detectat:</span>
          <span style={{
            padding: "4px 12px",
            borderRadius: 20,
            background: "#ede9fe",
            color: "#6d28d9",
            fontSize: 13,
            fontWeight: 500,
          }}>{confirmedCounty}</span>
          <button
            onClick={() => setConfirmedCounty(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "2px 4px" }}
            title="Elimină județul"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Suggested interests — toggleable pills */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>
          Interese identificate{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— apasă pentru a adăuga/elimina</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allCategories.map(cat => {
            const active = confirmedInterests.includes(cat);
            const wasSuggested = suggestion?.interests?.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleInterest(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${active ? (wasSuggested ? "#6366f1" : "var(--primary)") : "var(--border-input)"}`,
                  background: active ? (wasSuggested ? "#ede9fe" : "var(--primary)") : "transparent",
                  color: active ? (wasSuggested ? "#4c1d95" : "var(--primary-text)") : "var(--text-muted)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.12s",
                  whiteSpace: "nowrap",
                  fontWeight: active && wasSuggested ? 600 : 400,
                }}
              >
                {active && <Check size={12} />}
                {cat}
                {wasSuggested && !active && (
                  <span style={{ fontSize: 10, opacity: 0.6 }}>✦</span>
                )}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
          ✦ = sugerat de AI &nbsp;|&nbsp; Poți adăuga orice altă categorie
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onComplete(confirmedCounty, confirmedInterests)}
          disabled={confirmedInterests.length === 0 && !confirmedCounty}
          style={{
            flex: 1,
            padding: "11px 20px",
            borderRadius: 8,
            background: "var(--primary)",
            color: "var(--primary-text)",
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            cursor: confirmedInterests.length === 0 && !confirmedCounty ? "not-allowed" : "pointer",
            opacity: confirmedInterests.length === 0 && !confirmedCounty ? 0.5 : 1,
            fontFamily: "var(--font)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Check size={15} />
          Confirmă și salvează
        </button>
        <button
          onClick={() => onComplete(null, [])}
          style={{
            padding: "11px 16px",
            borderRadius: 8,
            background: "transparent",
            color: "var(--text-muted)",
            border: "1.5px solid var(--border-input)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font)",
            whiteSpace: "nowrap",
          }}
        >
          Sari peste
        </button>
      </div>
    </div>
  );
}

// ─── Manual Mode ───────────────────────────────────────────────────────────────

function ManualMode({
  onComplete,
  onBack,
}: {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
}) {
  const [metadata, setMetadata] = useState<{ impact_categories: string[]; counties: string[] } | null>(null);
  const [county, setCounty] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    api.getMetadata().then(setMetadata).catch(console.error);
  }, []);

  const toggle = (cat: string) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, textAlign: "left", padding: 0 }}
      >
        ← Înapoi
      </button>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Selectează preferințele</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0 }}>Poți alege oricâte categorii te interesează.</p>
      </div>

      {/* County */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Județ</label>
        {metadata ? (
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              fontSize: 13.5,
              border: "1px solid var(--border-input)",
              borderRadius: 8,
              background: "var(--surface)",
              color: county ? "var(--text)" : "var(--text-muted)",
              fontFamily: "var(--font)",
              outline: "none",
            }}
          >
            <option value="">— Niciun județ —</option>
            {metadata.counties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <div style={{ height: 40, background: "var(--border-input)", borderRadius: 8 }} />
        )}
      </div>

      {/* Categories */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 10 }}>
          Interese civice <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({selected.length} alese)</span>
        </label>
        {metadata ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {metadata.impact_categories.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1.5px solid ${active ? "var(--primary)" : "var(--border-input)"}`,
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "var(--primary-text)" : "var(--text)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.12s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {active && <Check size={12} />}
                  {cat}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ height: 80, background: "var(--border-input)", borderRadius: 8 }} />
        )}
      </div>

      <button
        onClick={() => onComplete(county || null, selected)}
        style={{
          padding: "11px 20px",
          borderRadius: 8,
          background: "var(--primary)",
          color: "var(--primary-text)",
          border: "none",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "var(--font)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        Salvează și continuă
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

// ─── Done Screen ───────────────────────────────────────────────────────────────

function DoneScreen({ county, interests }: { county: string | null; interests: string[] }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
      <h2 style={{ fontSize: 19, fontWeight: 600, margin: "0 0 8px" }}>Profil configurat!</h2>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 16px" }}>
        {county || interests.length > 0
          ? `Am salvat: ${[county, ...(interests.slice(0, 2))].filter(Boolean).join(", ")}${interests.length > 2 ? ` și altele` : ""}.`
          : "Poți seta preferințele oricând din pagina de Profil."}
      </p>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Ești redirecționat...</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSaving, setIsSaving] = useState(false);
  const [savedCounty, setSavedCounty] = useState<string | null>(null);
  const [savedInterests, setSavedInterests] = useState<string[]>([]);

  const handleComplete = async (county: string | null, interests: string[]) => {
    setIsSaving(true);
    setSavedCounty(county);
    setSavedInterests(interests);
    setMode("done");
    try {
      const patch: Record<string, any> = {};
      if (county) patch.county = county;
      if (interests.length > 0) patch.interests = interests;
      if (Object.keys(patch).length > 0) {
        const updated = await api.updateProfile(patch);
        updateUser(updated);
      }
    } catch (e) {
      console.error("[Onboarding] Profile save failed:", e);
    } finally {
      setIsSaving(false);
      setTimeout(() => navigate({ to: "/" }), 2500);
    }
  };

  const handleSkip = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="card-centered" style={{ minHeight: "100vh", padding: "40px 16px" }}>
      <div className="card" style={{ maxWidth: 600, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/favicon.png" alt="CivicMind" style={{ width: 24, height: 24, objectFit: "contain" }} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.3px" }}>CivicMind</span>
          </div>
          {mode !== "done" && (
            <button
              onClick={handleSkip}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
            >
              <X size={14} /> Sari peste
            </button>
          )}
        </div>

        {/* Choose mode */}
        {mode === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.4px", margin: "0 0 6px" }}>
                Bine ai venit! 👋
              </h1>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.65 }}>
                Contul tău a fost creat. Personalizează-ți feed-ul legislativ alegând categoriile care te interesează.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* AI option */}
              <button
                onClick={() => setMode("ai")}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px",
                  border: "1.5px solid var(--border-input)", borderRadius: 12,
                  background: "var(--surface)", cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "var(--font)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px var(--primary-light, #e0ecff)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-input)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles size={18} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>Descrie-te asistentului AI</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Scrie câteva cuvinte despre tine, iar AI-ul va extrage și-ți va sugera interesele și județul.
                  </div>
                </div>
              </button>

              {/* Manual option */}
              <button
                onClick={() => setMode("manual")}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px",
                  border: "1.5px solid var(--border-input)", borderRadius: 12,
                  background: "var(--surface)", cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "var(--font)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px var(--primary-light, #e0ecff)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-input)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckSquare size={18} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>Selectează manual</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Alege județ și categorii de interes direct dintr-o listă.
                  </div>
                </div>
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
              Poți modifica oricând preferințele din pagina de{" "}
              <button onClick={() => navigate({ to: "/profile" })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text)", textDecoration: "underline", fontSize: 12, fontFamily: "var(--font)" }}>Profil</button>.
            </p>
          </div>
        )}

        {mode === "ai" && (
          <AiMode onComplete={handleComplete} onBack={() => setMode("choose")} />
        )}

        {mode === "manual" && (
          <ManualMode onComplete={handleComplete} onBack={() => setMode("choose")} />
        )}

        {mode === "done" && isSaving && (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 14 }}>
            Se salvează...
          </div>
        )}

        {mode === "done" && !isSaving && (
          <DoneScreen county={savedCounty} interests={savedInterests} />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
