import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, CheckSquare, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { AiMode } from "./ai-mode";
import { ManualMode } from "./manual-mode";
import { DoneScreen } from "./done-screen";

type Mode = "choose" | "ai" | "manual" | "done";

export function OnboardingPage() {
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
      const patch: { county?: string; interests?: string[] } = {};
      if (county) patch.county = county;
      if (interests.length > 0) patch.interests = interests;
      if (Object.keys(patch).length > 0) {
        const updated = await api.updateProfile(patch);
        updateUser(updated);
      }
    } catch (e) {
      // Profile save is best-effort during onboarding, can be updated later in Profile
    } finally {
      setIsSaving(false);
      setTimeout(() => navigate({ to: "/" }), 2500);
    }
  };

  const handleSkip = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lg:p-10">
      <div className="w-full max-w-[560px] bg-white border border-gray-100 rounded-[28px] shadow-2xl shadow-gray-200/50 p-8 lg:p-10 relative overflow-hidden">
        {/* Progress Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-50">
          <div 
            className="h-full bg-gray-900 transition-all duration-500 ease-out" 
            style={{ width: mode === "choose" ? "33%" : mode === "done" ? "100%" : "66%" }} 
          />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-200">
              <img src="/favicon.png" alt="" className="w-5 h-5 invert brightness-0" />
            </div>
            <span className="text-[15px] font-black tracking-tight text-gray-900">CivicMind</span>
          </div>
          {mode !== "done" && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={14} /> Sari peste
            </button>
          )}
        </div>

        {/* Choose mode */}
        {mode === "choose" && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                Salutare! 👋
              </h1>
              <p className="text-[15px] text-gray-500 leading-relaxed">
                Contul tău e gata. Spune-ne ce te interesează ca să-ți pregătim un feed legislativ personalizat.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* AI option */}
              <button
                onClick={() => setMode("ai")}
                className="group flex items-start gap-5 p-5 border-2 border-gray-50 rounded-2xl bg-white hover:border-gray-900 hover:shadow-xl hover:shadow-gray-100 transition-all text-left relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <div className="text-[16px] font-bold text-gray-900 mb-1">Descrie-te asistentului AI</div>
                  <div className="text-[13.5px] text-gray-500 leading-snug">
                    Scrie câteva cuvinte despre tine, iar AI-ul va extrage automat interesele și județul.
                  </div>
                </div>
              </button>

              {/* Manual option */}
              <button
                onClick={() => setMode("manual")}
                className="group flex items-start gap-5 p-5 border-2 border-gray-50 rounded-2xl bg-white hover:border-gray-900 hover:shadow-xl hover:shadow-gray-100 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                  <CheckSquare size={22} className="text-white" />
                </div>
                <div>
                  <div className="text-[16px] font-bold text-gray-900 mb-1">Selectează manual</div>
                  <div className="text-[13.5px] text-gray-500 leading-snug">
                    Alege județul și domeniile de interes direct dintr-o listă completă.
                  </div>
                </div>
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs font-medium text-gray-400">
                Poți modifica oricând preferințele din pagina de{" "}
                <button 
                  onClick={() => navigate({ to: "/profile" })} 
                  className="text-gray-900 underline underline-offset-2 hover:text-black transition-colors font-bold"
                >
                  Profil
                </button>
              </p>
            </div>
          </div>
        )}

        {mode === "ai" && (
          <AiMode onComplete={handleComplete} onBack={() => setMode("choose")} />
        )}

        {mode === "manual" && (
          <ManualMode onComplete={handleComplete} onBack={() => setMode("choose")} />
        )}

        {mode === "done" && isSaving && (
          <div className="text-center py-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin" />
            <div className="text-[15px] font-bold text-gray-400">Se salvează profilul tău...</div>
          </div>
        )}

        {mode === "done" && !isSaving && (
          <DoneScreen county={savedCounty} interests={savedInterests} />
        )}
      </div>
    </div>
  );
}
