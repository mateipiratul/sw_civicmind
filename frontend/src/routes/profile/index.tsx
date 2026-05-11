import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfileSkeleton() {
  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="flex-1 px-10 lg:px-20 py-20 max-w-[850px] mx-auto space-y-16">
        <Skeleton className="h-12 w-80" />
        <div className="flex items-center gap-8 pb-14 border-b border-border">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
        <div className="space-y-10 py-14 border-b border-border">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 gap-8">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, updateUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [county, setCounty] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
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

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-black selection:text-white">
      <div className="flex flex-col min-h-screen center">
        <main className="flex-1 px-10 lg:px-20 py-20 max-w-[900px] w-full mx-auto">
          {/* Page title */}
          <div className="mb-16">
            <p className="text-[13px] font-medium tracking-[0.16em] uppercase text-muted-foreground mb-4">Cont</p>
            <h1 className="text-[38px] font-semibold tracking-[-0.03em] leading-tight">
              Profil utilizator
            </h1>
            <p className="text-lg text-muted-foreground mt-3">
              Gestionează setările contului și interesele civice.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-0">
            {/* Identity block */}
            <div className="flex items-start gap-8 pb-14 border-b border-border">
              <div className="h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center text-2xl font-semibold tracking-wide shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 pt-2">
                <p className="font-semibold text-foreground text-xl leading-tight truncate">{username || "Utilizator"}</p>
                <p className="text-lg text-muted-foreground mt-2 truncate">{email}</p>
              </div>
            </div>

            {/* Basic Fields */}
            <div className="py-14 border-b border-border space-y-10">
              <p className="text-[13px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Informații de bază</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Field label="Nume utilizator">
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    placeholder="Ex: Alexandru Popescu"
                    className="w-full px-4 py-3.5 rounded-lg border border-border bg-card text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-foreground transition"
                  />
                </Field>
                <Field label="Adresă de email">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="email@exemplu.ro"
                    className="w-full px-4 py-3.5 rounded-lg border border-border bg-card text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-foreground transition"
                  />
                </Field>
              </div>
            </div>

            {/* Reședință */}
            <div className="py-14 border-b border-border space-y-8">
              <p className="text-[13px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Reședință</p>
              <Field label="Județ de reședință" hint="Vom prioritiza legile și reprezentanții din acest județ în feed.">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCountyOpen(o => !o)}
                    className="w-full px-4 py-3.5 rounded-lg border border-border bg-card text-foreground text-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-foreground transition hover:bg-muted/50"
                  >
                    <span>{county || "Selectează un județ"}</span>
                    <svg className={cn("w-6 h-6 text-muted-foreground transition-transform", countyOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {countyOpen && (
                    <div className="absolute z-20 mt-3 w-full bg-card border border-border rounded-lg shadow-2xl max-h-72 overflow-y-auto py-3 animate-in fade-in zoom-in-95 duration-100">
                      {metadata?.counties.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setCounty(c); setCountyOpen(false); }}
                          className={cn(
                            "w-full px-5 py-3 text-lg text-left hover:bg-muted transition-colors flex items-center gap-4",
                            county === c ? "font-medium text-foreground bg-muted/30" : "text-muted-foreground"
                          )}
                        >
                          {county === c && <span className="w-2.5 h-2.5 rounded-full bg-foreground" />}
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* Interests */}
            <div className="py-14 border-b border-border space-y-8">
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Interese civice</p>
                {selectedInterests.length > 0 && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {selectedInterests.length} selectate
                  </span>
                )}
              </div>
              <p className="text-base text-muted-foreground -mt-3">Selectează ariile care te afectează direct pentru un feed personalizat.</p>
              <div className="flex flex-wrap gap-3">
                {metadata?.impact_categories.map(cat => {
                  const active = selectedInterests.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleInterest(cat)}
                      className={cn(
                        "px-5 py-2.5 rounded-md text-base font-medium transition-all border",
                        active
                          ? "bg-foreground text-background border-foreground shadow-sm"
                          : "bg-card text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toast Notification */}
            {toast && (
              <div
                className={cn(
                  "mt-10 px-6 py-5 rounded-lg text-lg font-medium flex items-center gap-4 border transition-all animate-in slide-in-from-top-2",
                  toast.type === "ok"
                    ? "bg-[#f0faf4] text-[#1a6b3c] border-[#b6e4cc]"
                    : "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
                )}
              >
                {toast.type === "ok" ? (
                  <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {toast.msg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-14 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-10 py-4 rounded-lg bg-foreground text-background text-lg font-semibold hover:bg-foreground/85 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isUpdating ? "Se salvează…" : "Salvează modificările"}
              </button>
              <button
                type="button"
                onClick={() => refreshUser()}
                className="px-10 py-4 rounded-lg bg-card text-foreground text-lg font-medium border border-border hover:bg-muted transition-colors"
              >
                Sincronizează datele
              </button>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 w-full">
      <label className="block text-sm font-semibold tracking-[0.06em] uppercase text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
