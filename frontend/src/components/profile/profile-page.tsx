import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import type { User as UserType } from "@/lib/api";

// Modular Components
import { ProfileHeader } from "./profile-header";
import { InterestsSection } from "./interests-section";
import { CountySection } from "./county-section";
import { DangerZone } from "./danger-zone";

function ProfileSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 640, background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 40, boxShadow: "var(--shadow-card)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

interface ProfileFormProps {
  user: UserType;
  updateUser: (data: Partial<UserType>) => void;
  logout: () => void | Promise<void>;
  metadata?: { impact_categories: string[], counties: string[] };
}

function ProfileForm({ user, updateUser, logout, metadata }: ProfileFormProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.username || "");
  const [email] = useState(user.email || "");
  const [county, setCounty] = useState(user.county || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<"idle" | "confirm" | "done">("idle");
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAiComplete = (newCounty: string | null, interests: string[]) => {
    if (newCounty) setCounty(newCounty);
    setSelectedInterests(interests);
  };

  const executeProfileUpdate = async () => {
    setIsUpdating(true);
    setToast(null);
    try {
      const updated = await api.updateProfile({
        username,
        email,
        county,
        interests: selectedInterests,
      });
      updateUser(updated);
      setUpdateStep("done");
      setTimeout(() => {
        setUpdateStep("idle");
        setToast({ type: "ok", msg: "Profil actualizat cu succes!" });
        setTimeout(() => setToast(null), 3000);
      }, 1500);
    } catch (err) {
      setToast({
        type: "err",
        msg: err instanceof Error ? err.message : "Actualizarea a eșuat",
      });
      setUpdateStep("idle");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    setIsDeleting(true);
    try {
      await api.deleteAccount(password);
      setTimeout(async () => {
        await logout();
        navigate({ to: "/" });
      }, 2500);
    } finally {
      setIsDeleting(false);
    }
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "block",
  };

  const fieldInput: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    fontSize: 14.5,
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const divider: React.CSSProperties = {
    height: 1,
    background: "var(--border)",
    width: "100%",
  };

  return (
    <div style={{ width: "100%", maxWidth: 640, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: "40px 44px", position: "relative" }}>
      <ProfileHeader />

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Username & Email row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <label style={fieldLabel}>Nume utilizator</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={fieldInput}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>
          <div style={{ opacity: 0.55 }}>
            <label style={fieldLabel}>Email (doar citire)</label>
            <input
              value={email}
              disabled
              style={{ ...fieldInput, cursor: "not-allowed", color: "var(--text-muted)" }}
            />
          </div>
        </div>

        <div style={divider} />

        <CountySection
          currentCounty={county}
          counties={metadata?.counties || []}
          onChange={setCounty}
        />

        <div style={divider} />

        <InterestsSection
          selectedInterests={selectedInterests}
          allCategories={metadata?.impact_categories || []}
          onToggle={handleToggleInterest}
          onAiComplete={handleAiComplete}
        />

        {/* Save button */}
        <div>
          <button
            onClick={() => setUpdateStep("confirm")}
            disabled={isUpdating}
            style={{
              width: "100%",
              height: 46,
              borderRadius: "var(--radius)",
              border: "none",
              background: isUpdating ? "var(--text-muted)" : "var(--primary)",
              color: "var(--primary-text)",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: isUpdating ? "default" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = "var(--primary-hover)"; }}
            onMouseLeave={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = "var(--primary)"; }}
          >
            {isUpdating ? "Se salvează..." : "Salvează modificările"}
          </button>
        </div>

        {toast && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "var(--radius)",
            fontSize: 13.5,
            fontWeight: 600,
            textAlign: "center",
            background: toast.type === "ok" ? "#f0fdf4" : "#fef2f2",
            color: toast.type === "ok" ? "#16a34a" : "#dc2626",
            border: `1px solid ${toast.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          }}>
            {toast.msg}
          </div>
        )}

        <DangerZone onDelete={handleDeleteAccount} isDeleting={isDeleting} />
      </div>

      {/* Confirm modal */}
      {updateStep !== "idle" && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => e.target === e.currentTarget && updateStep === "confirm" && setUpdateStep("idle")}
        >
          <div style={{ width: "100%", maxWidth: 400, background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: "1px solid var(--border)" }}>
            {updateStep === "confirm" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, background: "var(--bg)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid var(--border)" }}>
                    <Check size={24} style={{ color: "var(--text)" }} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>Confirmă salvarea</h2>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>Ești sigur că vrei să actualizezi setările profilului tău?</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={executeProfileUpdate}
                    disabled={isUpdating}
                    style={{ flex: 1, height: 44, borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "var(--primary-text)", fontSize: 14, fontWeight: 600, cursor: isUpdating ? "default" : "pointer", fontFamily: "inherit" }}
                  >
                    Da, salvează
                  </button>
                  <button
                    onClick={() => setUpdateStep("idle")}
                    style={{ height: 44, padding: "0 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Anulează
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8 }}>Profil actualizat</h2>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>Modificările tale au fost procesate cu succes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const navigate = useNavigate();

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  if (isAuthLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 80px" }}>
      <ProfileForm
        user={user}
        updateUser={updateUser}
        logout={logout}
        metadata={metadata}
      />
    </div>
  );
}
