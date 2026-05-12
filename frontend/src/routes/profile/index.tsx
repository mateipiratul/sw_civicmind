import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkles, Send, Check, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfileSkeleton() {
  return (
    <div className="card-centered" style={{ padding: "40px 16px" }}>
      <div className="card" style={{ maxWidth: 640 }}>
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-6 w-full mb-4" />
        <Skeleton className="h-6 w-full mb-4" />
        <Skeleton className="h-10 w-full mt-4" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, updateUser, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [county, setCounty] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<"idle" | "confirm" | "done">("idle");
  const [deleteStep, setDeleteStep] = useState<"idle" | "password" | "confirm" | "done">("idle");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [countyOpen, setCountyOpen] = useState(false);
  
  const [metadata, setMetadata] = useState<{ impact_categories: string[], counties: string[] } | null>(null);

  // AI interests mode
  const [interestsMode, setInterestsMode] = useState<"manual" | "ai">("manual");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState<"input" | "confirm">("input");
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setCounty(user.county || "");
      setSelectedInterests(user.interests || []);
    }
  }, [user]);

  useEffect(() => {
    api.getMetadata().then(setMetadata).catch(console.error);
  }, []);

  const initials = username.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateStep("confirm");
  };

  const executeProfileUpdate = async () => {
    setIsUpdating(true);
    setToast(null);

    try {
      const updated = await api.updateProfile({ 
        username, 
        email, 
        county, 
        interests: selectedInterests 
      });
      updateUser(updated);
      setUpdateStep("done");
      // Show success message briefly but don't redirect
      setTimeout(() => {
        setUpdateStep("idle");
        setToast({ type: "ok", msg: "Profil actualizat cu succes!" });
        setTimeout(() => setToast(null), 3500);
      }, 1500);
    } catch (err) {
      setToast({ 
        type: "err", 
        msg: err instanceof Error ? err.message : "Actualizarea profilului a eșuat" 
      });
      setUpdateStep("idle");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const handleAiAnalyze = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const meta = metadata ?? await api.getMetadata();
      const analysis = await api.analyzeOnboardingProfile(text, meta.counties, meta.impact_categories);
      if (analysis.county) setCounty(analysis.county);
      setAiSuggested(analysis.interests ?? []);
      setSelectedInterests(analysis.interests ?? []);
      setAiStep("confirm");
    } catch {
      setAiError("Nu am putut analiza descrierea. Verifică că serviciul AI este pornit.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiConfirm = () => {
    setAiStep("input");
    setAiInput("");
    setAiSuggested([]);
    setInterestsMode("manual");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deletePassword);
      setDeleteStep("done");
      // Give the success modal a moment to show, then log out and redirect
      setTimeout(async () => {
        await logout();
        navigate({ to: "/" });
      }, 2800);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Ștergerea contului a eșuat.");
      setDeleteStep("confirm"); // stay on confirm so they can retry
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="card-centered" style={{ padding: "40px 16px", alignItems: "flex-start" }}>
      <div className="card" style={{ maxWidth: 640 }}>
        
        <div className="login-header" style={{ marginBottom: 16 }}>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-semibold tracking-wide shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="login-title">Profil utilizator</h1>
              <p className="login-subtitle">Gestionează setările contului tău.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="form-col" style={{ gap: 24 }}>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Nume utilizator</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="form-input opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email-ul nu poate fi modificat.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Județ de reședință</label>
            <p className="text-xs text-muted-foreground mb-1">Folosit pentru a prioritiza reprezentanții din județul tău.</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountyOpen(o => !o)}
                className="form-input w-full text-left flex items-center justify-between"
                style={{ cursor: "pointer", background: "var(--surface)" }}
              >
                <span>{county || "Selectează un județ"}</span>
                <svg className={cn("w-4 h-4 text-muted-foreground transition-transform", countyOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {countyOpen && (
                <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto py-2">
                  {metadata?.counties.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCounty(c); setCountyOpen(false); }}
                      className={cn(
                        "w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-3",
                        county === c ? "font-medium text-foreground bg-muted/50" : "text-muted-foreground"
                      )}
                    >
                      {county === c && <span className="w-2 h-2 rounded-full bg-foreground" />}
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            {/* Header: label + mode toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Interese civice</label>
                {selectedInterests.length > 0 && (
                  <span className="text-xs text-muted-foreground">{selectedInterests.length} selectate</span>
                )}
              </div>
              {/* Mode toggle pill */}
              <div style={{ display: "flex", background: "var(--muted, #f3f4f6)", borderRadius: 8, padding: 3, gap: 2 }}>
                <button
                  type="button"
                  onClick={() => { setInterestsMode("manual"); setAiStep("input"); }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 12,
                    fontWeight: interestsMode === "manual" ? 600 : 400,
                    background: interestsMode === "manual" ? "var(--surface)" : "transparent",
                    color: interestsMode === "manual" ? "var(--text)" : "var(--text-muted)",
                    cursor: "pointer",
                    boxShadow: interestsMode === "manual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s", fontFamily: "var(--font)",
                  }}
                >
                  Selectează manual
                </button>
                <button
                  type="button"
                  onClick={() => { setInterestsMode("ai"); setTimeout(() => aiTextareaRef.current?.focus(), 50); }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 12,
                    fontWeight: interestsMode === "ai" ? 600 : 400,
                    background: interestsMode === "ai" ? "var(--surface)" : "transparent",
                    color: interestsMode === "ai" ? "#6366f1" : "var(--text-muted)",
                    cursor: "pointer",
                    boxShadow: interestsMode === "ai" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s", fontFamily: "var(--font)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Sparkles size={11} /> Descrie-te AI-ului
                </button>
              </div>
            </div>

            {/* ── Manual mode ── */}
            {interestsMode === "manual" && (
              <>
                <p className="text-xs text-muted-foreground mb-2">Selectează ariile care te afectează direct pentru un feed personalizat.</p>
                <div className="flex flex-wrap gap-2">
                  {metadata?.impact_categories.map(cat => {
                    const active = selectedInterests.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={cn("interest-pill", active && "active")}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── AI mode: input step ── */}
            {interestsMode === "ai" && aiStep === "input" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p className="text-xs text-muted-foreground">
                  Descrie-te în câteva cuvinte și AI-ul va sugera automat categoriile și județul.{" "}
                  <em>Ex: „Sunt avocat în Cluj, interesat de justiție și antreprenoriat."</em>
                </p>
                <div style={{ position: "relative" }}>
                  <textarea
                    ref={aiTextareaRef}
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiAnalyze(); } }}
                    disabled={aiLoading}
                    placeholder="Descrie-ți profesia, orașul sau interesele civice..."
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 46px 10px 12px", fontSize: 13.5,
                      border: "1.5px solid var(--border-input)", borderRadius: 8,
                      background: "var(--surface)", color: "var(--text)",
                      fontFamily: "var(--font)", resize: "vertical", boxSizing: "border-box", outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAiAnalyze}
                    disabled={!aiInput.trim() || aiLoading}
                    style={{
                      position: "absolute", right: 8, bottom: 8, width: 30, height: 30,
                      borderRadius: 7,
                      background: !aiInput.trim() || aiLoading ? "var(--border-input)" : "#6366f1",
                      border: "none",
                      cursor: !aiInput.trim() || aiLoading ? "not-allowed" : "pointer",
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    <Send size={13} />
                  </button>
                </div>
                {aiLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6366f1", fontSize: 13 }}>
                    <Sparkles size={13} /> Se analizează...
                  </div>
                )}
                {aiError && (
                  <p style={{ fontSize: 12.5, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "7px 11px", margin: 0 }}>
                    {aiError}
                  </p>
                )}
              </div>
            )}

            {/* ── AI mode: confirm step ── */}
            {interestsMode === "ai" && aiStep === "confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* AI bubble */}
                <div style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1px solid #c4b5fd", borderRadius: 10, padding: "11px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Sparkles size={13} color="white" />
                  </div>
                  <p style={{ fontSize: 13, color: "#4c1d95", margin: 0, lineHeight: 1.55 }}>
                    <strong>Am identificat {aiSuggested.length} categorii</strong> — marcate cu ✦ mai jos.
                    {county && <> Am setat și județul <strong>{county}</strong>.</>}{" "}
                    Poți ajusta selecția înainte de a salva.
                  </p>
                </div>

                {/* All pills, suggested ones highlighted */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {metadata?.impact_categories.map(cat => {
                    const active = selectedInterests.includes(cat);
                    const wasSuggested = aiSuggested.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        style={{
                          padding: "5px 12px", borderRadius: 20,
                          border: `1.5px solid ${active ? (wasSuggested ? "#6366f1" : "var(--primary)") : "var(--border-input)"}`,
                          background: active ? (wasSuggested ? "#ede9fe" : "var(--primary)") : "transparent",
                          color: active ? (wasSuggested ? "#4c1d95" : "var(--primary-text)") : "var(--text-muted)",
                          fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font)",
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "all 0.12s", whiteSpace: "nowrap",
                          fontWeight: active && wasSuggested ? 600 : 400,
                        }}
                      >
                        {active && <Check size={11} />}
                        {cat}
                        {wasSuggested && !active && <span style={{ fontSize: 9, opacity: 0.7 }}>✦</span>}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>✦ = sugerat de AI · Apasă orice categorie pentru a adăuga/elimina</p>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleAiConfirm}
                    style={{
                      padding: "7px 14px", borderRadius: 7, background: "#6366f1", color: "white",
                      border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <Check size={13} /> Confirmă selecția
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiStep("input"); setAiSuggested([]); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: 0, fontFamily: "var(--font)" }}
                  >
                    <RotateCcw size={11} /> Rescrie
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isUpdating} className="form-button" style={{ flex: 1 }}>
              {isUpdating ? "Se salvează…" : "Salvează modificările"}
            </button>
          </div>
        </form>

        <div className="form-divider" style={{ margin: "10px 0" }}>
          <div className="form-divider-line" />
        </div>

        <div className="danger-zone" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-destructive)" }}>Zona Periculoasă</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Odată șters, contul și toate datele tale nu mai pot fi recuperate.</p>
          </div>
          <button
            onClick={() => { setDeleteStep("password"); setDeletePassword(""); setDeleteError(null); }}
            className="form-button"
            style={{ background: "var(--surface)", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            Șterge contul
          </button>
        </div>

        {/* ── Profile Update Modal Overlay ── */}
        {updateStep !== "idle" && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
              zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget && updateStep !== "done" && !isUpdating) { setUpdateStep("idle"); } }}
          >
            <div style={{
              background: "var(--card, #fff)", borderRadius: 16, padding: "28px 28px 24px",
              maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: 20,
            }}>

              {/* Confirmation step */}
              {updateStep === "confirm" && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✎</div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>Confirmă modificările</h2>
                    <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      Ești sigur că vrei să salvezi aceste modificări?
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={executeProfileUpdate}
                      disabled={isUpdating}
                      style={{
                        flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
                        background: "#6366f1", color: "white", fontSize: 14, fontWeight: 500,
                        cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.7 : 1,
                        fontFamily: "var(--font)",
                      }}
                    >
                      {isUpdating ? "Se salvează..." : "Da, salvează modificările"}
                    </button>
                    <button
                      onClick={() => { setUpdateStep("idle"); }}
                      disabled={isUpdating}
                      style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font)" }}
                    >
                      Anulează
                    </button>
                  </div>
                </>
              )}

              {/* Success step */}
              {updateStep === "done" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>Profil actualizat</h2>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                    Modificările au fost salvate cu succes.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Delete Modal Overlay ── */}
        {deleteStep !== "idle" && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
              zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget && deleteStep !== "done" && !isDeleting) { setDeleteStep("idle"); setDeletePassword(""); setDeleteError(null); } }}
          >
            <div style={{
              background: "var(--card, #fff)", borderRadius: 16, padding: "28px 28px 24px",
              maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: 20,
            }}>

              {/* Step 1 — Password */}
              {deleteStep === "password" && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>Confirmă identitatea</h2>
                    <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0 }}>
                      Introdu parola contului tău pentru a continua.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="password"
                      autoFocus
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && deletePassword.trim()) setDeleteStep("confirm"); }}
                      placeholder="Parola ta"
                      className="form-input"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => { if (deletePassword.trim()) setDeleteStep("confirm"); }}
                      disabled={!deletePassword.trim()}
                      style={{
                        flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
                        background: deletePassword.trim() ? "#dc2626" : "var(--border-input)",
                        color: "white", fontSize: 14, fontWeight: 500,
                        cursor: deletePassword.trim() ? "pointer" : "not-allowed",
                        fontFamily: "var(--font)",
                      }}
                    >
                      Continuă
                    </button>
                    <button
                      onClick={() => { setDeleteStep("idle"); setDeletePassword(""); }}
                      style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font)" }}
                    >
                      Anulează
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 — Confirmation */}
              {deleteStep === "confirm" && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "#b91c1c" }}>Ești sigur?</h2>
                    <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      Această acțiune este <strong>ireversibilă</strong>. Contul tău, profilul și toate datele asociate vor fi șterse permanent.
                    </p>
                  </div>
                  {deleteError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
                      {deleteError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      style={{
                        flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
                        background: "#dc2626", color: "white", fontSize: 14, fontWeight: 500,
                        cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.7 : 1,
                        fontFamily: "var(--font)",
                      }}
                    >
                      {isDeleting ? "Se șterge..." : "Da, șterge contul definitiv"}
                    </button>
                    <button
                      onClick={() => { setDeleteStep("idle"); setDeletePassword(""); setDeleteError(null); }}
                      disabled={isDeleting}
                      style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font)" }}
                    >
                      Anulează
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 — Done / Success */}
              {deleteStep === "done" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>Cont șters cu succes</h2>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                    Contul tău a fost șters definitiv. Îți mulțumim că ai folosit CivicMind.<br />
                    Ești redirecționat...
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
