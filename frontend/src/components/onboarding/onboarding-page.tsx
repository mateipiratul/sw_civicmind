import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ListChecks, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { AiMode } from "./ai-mode";
import { ManualMode } from "./manual-mode";
import { DoneScreen } from "./done-screen";

type Mode = "choose" | "ai" | "manual" | "done";

const progressByMode: Record<Mode, string> = {
  choose: "35%",
  ai: "70%",
  manual: "70%",
  done: "100%",
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSaving, setIsSaving] = useState(false);
  const [savedCounty, setSavedCounty] = useState<string | null>(null);
  const [savedInterests, setSavedInterests] = useState<string[]>([]);

  const goToFeed = () => {
    navigate({ to: "/", search: { page: undefined, category: undefined } });
  };

  const handleComplete = async (county: string | null, interests: string[]) => {
    setIsSaving(true);
    setSavedCounty(county);
    setSavedInterests(interests);
    setMode("done");
    try {
      const patch: { county?: string; personal_interest_areas?: string[] } = {};
      if (county) patch.county = county;
      if (interests.length > 0) patch.personal_interest_areas = interests;
      if (Object.keys(patch).length > 0) {
        const updated = await api.updateProfile(patch);
        updateUser(updated);
      }
    } catch {
      // Profile save is best-effort during onboarding, can be updated later in Profile.
    } finally {
      setIsSaving(false);
      setTimeout(goToFeed, 2500);
    }
  };

  const handleSkip = () => {
    goToFeed();
  };

  const renderBrand = () => (
    <div className="onboarding-brand">
      <div className="onboarding-logo-badge">
        <img src="/favicon.png" alt="" className="onboarding-logo-img" />
      </div>
      <span>CivicMind</span>
    </div>
  );

  const renderProgress = () => (
    <div className="onboarding-progress-track" aria-hidden="true">
      <div
        className="onboarding-progress-fill"
        style={{ width: progressByMode[mode] }}
      />
    </div>
  );

  if (mode === "choose") {
    return (
      <main className="onboarding-page">
        <section className="onboarding-modal" aria-labelledby="onboarding-title">
          <header className="onboarding-modal-header">
            {renderBrand()}
            <button
              type="button"
              onClick={handleSkip}
              className="onboarding-skip-button"
            >
              <X size={14} />
              <span>Sari peste</span>
            </button>
          </header>

          {renderProgress()}

          <div className="onboarding-modal-body">
            <div className="onboarding-status-pill">
              Cont creat
            </div>
            <h1 id="onboarding-title" className="onboarding-title">
              Spune-ne ce vrei să urmărești.
            </h1>
            <p className="onboarding-subtitle">
              Îți personalizăm feed-ul legislativ după județ și domeniile care contează pentru tine. Durează sub un minut.
            </p>
          </div>

          <div className="onboarding-choice-list">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className="onboarding-choice-card"
            >
              <div className="onboarding-choice-icon onboarding-choice-icon-dark">
                <Sparkles size={22} />
              </div>
              <div className="onboarding-choice-copy">
                <div className="onboarding-choice-title-row">
                  <span className="onboarding-choice-title">
                    Descrie-te asistentului AI
                  </span>
                  <span className="onboarding-rapid-pill">
                    Rapid
                  </span>
                </div>
                <p className="onboarding-choice-description">
                  Scrii câteva cuvinte, iar AI-ul propune automat județul și interesele.
                </p>
              </div>
              <ArrowRight size={20} className="onboarding-choice-arrow" />
            </button>

            <button
              type="button"
              onClick={() => setMode("manual")}
              className="onboarding-choice-card"
            >
              <div className="onboarding-choice-icon onboarding-choice-icon-green">
                <ListChecks size={22} />
              </div>
              <div className="onboarding-choice-copy">
                <div className="onboarding-choice-title">
                  Selectează manual
                </div>
                <p className="onboarding-choice-description">
                  Alegi tu județul și domeniile civice dintr-o listă clară.
                </p>
              </div>
              <ArrowRight size={20} className="onboarding-choice-arrow" />
            </button>
          </div>

          <p className="onboarding-footer-note">
            Poți modifica preferințele oricând din{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" })}
              className="onboarding-footer-link"
            >
              Profil
            </button>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-modal onboarding-modal-form">
        <header className="onboarding-modal-header">
          {renderBrand()}
          {mode !== "done" && (
            <button
              type="button"
              onClick={handleSkip}
              className="onboarding-skip-button"
            >
              <X size={14} />
              <span>Sari peste</span>
            </button>
          )}
        </header>

        {renderProgress()}

        <div className="onboarding-form-body">
          {mode === "ai" && (
            <AiMode onComplete={handleComplete} onBack={() => setMode("choose")} />
          )}

          {mode === "manual" && (
            <ManualMode onComplete={handleComplete} onBack={() => setMode("choose")} />
          )}

          {mode === "done" && isSaving && (
            <div className="onboarding-saving-state">
              <div className="onboarding-spinner" />
              <div>Se salvează profilul tău...</div>
            </div>
          )}

          {mode === "done" && !isSaving && (
            <DoneScreen county={savedCounty} interests={savedInterests} />
          )}
        </div>
      </section>
    </main>
  );
}
