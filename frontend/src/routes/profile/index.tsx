import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

// Modular Components
import { ProfileHeader } from "@/components/profile/profile-header";
import { InterestsSection } from "@/components/profile/interests-section";
import { CountySection } from "@/components/profile/county-section";
import { DangerZone } from "@/components/profile/danger-zone";

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[640px] bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
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

function ProfilePage() {
  const { user, updateUser, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [county, setCounty] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<"idle" | "confirm" | "done">("idle");
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setCounty(user.county || "");
      setSelectedInterests(user.interests || []);
    }
  }, [user]);

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
      // Wait for the success state in DangerZone, then logout
      setTimeout(async () => {
        await logout();
        navigate({ to: "/" });
      }, 2500);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lg:p-10">
      <div className="w-full max-w-[640px] bg-white border border-gray-100 rounded-[32px] shadow-2xl shadow-gray-200/40 p-8 lg:p-12 relative">
        <ProfileHeader />

        <div className="space-y-10">
          {/* General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-900 uppercase tracking-wider px-1">Nume utilizator</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-gray-900 outline-none transition-all font-bold text-[15px]"
              />
            </div>
            <div className="space-y-2 opacity-60">
              <label className="text-[13px] font-bold text-gray-900 uppercase tracking-wider px-1">Email (ReadOnly)</label>
              <input
                value={email}
                disabled
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-50 bg-gray-50 cursor-not-allowed font-medium text-[15px] text-gray-400"
              />
            </div>
          </div>

          <div className="w-full h-px bg-gray-50" />

          <CountySection
            currentCounty={county}
            counties={metadata?.counties || []}
            onChange={setCounty}
          />

          <div className="w-full h-px bg-gray-50" />

          <InterestsSection
            selectedInterests={selectedInterests}
            allCategories={metadata?.impact_categories || []}
            onToggle={handleToggleInterest}
            onAiComplete={handleAiComplete}
          />

          <div className="pt-4">
            <Button
              onClick={() => setUpdateStep("confirm")}
              disabled={isUpdating}
              className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black text-base shadow-xl shadow-gray-900/10 transition-all active:scale-[0.98]"
            >
              {isUpdating ? "Se salvează..." : "Salvează modificările"}
            </Button>
          </div>

          {toast && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}>
              {toast.msg}
            </div>
          )}

          <DangerZone onDelete={handleDeleteAccount} isDeleting={isDeleting} />
        </div>

        {/* Update Confirmation Modal */}
        {updateStep !== "idle" && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && updateStep === "confirm" && setUpdateStep("idle")}
          >
            <div className="w-full max-w-[400px] bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              {updateStep === "confirm" ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Confirmă salvarea</h2>
                    <p className="text-sm text-gray-500 font-medium">Ești sigur că vrei să actualizezi setările profilului tău?</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={executeProfileUpdate} disabled={isUpdating} className="flex-1 h-12 bg-gray-900 font-bold rounded-xl text-white">
                      Da, salvează
                    </Button>
                    <Button onClick={() => setUpdateStep("idle")} variant="ghost" className="h-12 font-bold text-gray-400">
                      Anulează
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                  <div className="text-6xl mb-6">✨</div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Profil actualizat</h2>
                  <p className="text-sm text-gray-500 font-medium tracking-tight mt-2">Modificările tale au fost procesate cu succes.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});
