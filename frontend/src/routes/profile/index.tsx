import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [countyOpen, setCountyOpen] = useState(false);
  
  const [metadata, setMetadata] = useState<{ impact_categories: string[], counties: string[] } | null>(null);

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
      setToast({ type: "ok", msg: "Profil actualizat cu succes!" });
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ 
        type: "err", 
        msg: err instanceof Error ? err.message : "Actualizarea profilului a eșuat" 
      });
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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setToast(null);
    try {
      await api.deleteAccount();
      await logout();
      navigate({ to: "/" });
    } catch (err) {
      setToast({ type: "err", msg: err instanceof Error ? err.message : "Ștergerea contului a eșuat" });
      setIsDeleting(false);
      setShowConfirmDelete(false);
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
                onChange={e => setEmail(e.target.value)}
                required
                className="form-input"
              />
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
            <div className="flex items-baseline justify-between mb-1">
              <label className="form-label">Interese civice</label>
              {selectedInterests.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedInterests.length} selectate
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">Selectează ariile care te afectează direct pentru un feed personalizat.</p>
            <div className="flex flex-wrap gap-2">
              {metadata?.impact_categories.map(cat => {
                const active = selectedInterests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleInterest(cat)}
                    className={cn(
                      "interest-pill",
                      active && "active"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {toast && (
            <div
              className={cn(
                "px-4 py-3 rounded-md text-[13.5px] font-medium border",
                toast.type === "ok"
                  ? "bg-[#f0faf4] text-[#1a6b3c] border-[#b6e4cc]"
                  : "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
              )}
            >
              {toast.msg}
            </div>
          )}

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
          
          {showConfirmDelete ? (
            <div style={{ background: "#fef2f2", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
              <p style={{ fontSize: 13, color: "#b91c1c", margin: "0 0 12px 0", fontWeight: 500 }}>
                Ești absolut sigur că vrei să ștergi acest cont definitiv?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="form-button"
                  style={{ background: "#dc2626", flex: 1, padding: "8px 12px", fontSize: 13 }}
                >
                  {isDeleting ? "Se șterge..." : "Da, șterge contul"}
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="form-button"
                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", flex: 1, padding: "8px 12px", fontSize: 13 }}
                >
                  Anulează
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="form-button"
              style={{ background: "var(--surface)", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              Șterge contul
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
