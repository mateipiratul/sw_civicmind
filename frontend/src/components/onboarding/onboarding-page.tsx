import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ListChecks, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { AiMode } from "./ai-mode";
import { ManualMode } from "./manual-mode";
import { DoneScreen } from "./done-screen";

type Mode = "choose" | "ai" | "manual" | "done";

const progressByMode: Record<Mode, string> = {
  choose: "34%",
  ai: "68%",
  manual: "68%",
  done: "100%",
};

const stepLabelByMode: Record<Mode, string> = {
  choose: "Pasul 1 din 2",
  ai: "Pasul 2 din 2",
  manual: "Pasul 2 din 2",
  done: "Gata",
};

const stepTitleByMode: Record<Mode, string> = {
  choose: "Alege metoda",
  ai: "Descrie preferințele",
  manual: "Selectează preferințele",
  done: "Feed pregătit",
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedCounty, setSavedCounty] = useState<string | null>(null);
  const [savedInterests, setSavedInterests] = useState<string[]>([]);

  const goToFeed = () => {
    navigate({ to: "/", search: { page: undefined, category: undefined } });
  };

  const handleComplete = async (county: string | null, interests: string[]) => {
    setIsSaving(true);
    setSaveError(null);
    setSavedCounty(county);
    setSavedInterests(interests);

    try {
      const updated = await api.updateProfile({
        ...(county ? { county } : {}),
        personal_interest_areas: interests,
      });
      updateUser(updated);
      setMode("done");
      setTimeout(goToFeed, 1800);
    } catch {
      setSaveError("Nu am putut salva preferințele. Încearcă din nou sau sari peste pentru moment.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderProgress = () => (
    <div className="onboarding-progress-track" aria-hidden="true">
      <div className="onboarding-progress-fill" style={{ width: progressByMode[mode] }} />
    </div>
  );

  const renderShell = (content: ReactNode) => (
    <main className="onboarding-page">
      <section className="onboarding-shell" aria-labelledby="onboarding-title">
        <section className="onboarding-workspace">
          <header className="onboarding-workspace-header">
            <div>
              <div className="onboarding-step-label">{stepLabelByMode[mode]}</div>
              <div className="onboarding-step-title">{stepTitleByMode[mode]}</div>
            </div>
            {mode !== "done" && (
              <button type="button" onClick={goToFeed} className="onboarding-skip-button">
                Sari peste
              </button>
            )}
          </header>

          {renderProgress()}

          <div className="onboarding-workspace-body">
            {saveError && (
              <div className="onboarding-save-error" role="alert">
                {saveError}
              </div>
            )}
            {content}
          </div>
        </section>
      </section>
    </main>
  );

  if (mode === "choose") {
    return renderShell(
      <>
        <div className="onboarding-modal-body">
          <div className="onboarding-status-pill">Cont creat</div>
          <h1 id="onboarding-title" className="onboarding-title">
            Alege ce domenii te interesează
          </h1>
          <p className="onboarding-subtitle">
            Îți personalizăm feed-ul legislativ după județ și domeniile care contează pentru tine. Durează sub un minut.
          </p>
        </div>

        <div className="onboarding-choice-list">
          <button type="button" onClick={() => setMode("ai")} className="onboarding-choice-card">
            <div className="onboarding-choice-icon onboarding-choice-icon-dark">
              <Sparkles size={20} />
            </div>
            <div className="onboarding-choice-copy">
              <div className="onboarding-choice-title-row">
                <span className="onboarding-choice-title">Descrie-te asistentului AI</span>
                <span className="onboarding-rapid-pill">Rapid</span>
              </div>
              <p className="onboarding-choice-description">
                Scrii câteva cuvinte, iar AI-ul propune automat județul și interesele.
              </p>
            </div>
            <ArrowRight size={18} className="onboarding-choice-arrow" />
          </button>

          <button type="button" onClick={() => setMode("manual")} className="onboarding-choice-card">
            <div className="onboarding-choice-icon onboarding-choice-icon-green">
              <ListChecks size={20} />
            </div>
            <div className="onboarding-choice-copy">
              <div className="onboarding-choice-title">Selectează manual</div>
              <p className="onboarding-choice-description">
                Alegi tu județul și domeniile civice dintr-o listă clară.
              </p>
            </div>
            <ArrowRight size={18} className="onboarding-choice-arrow" />
          </button>
        </div>

        <p className="onboarding-footer-note">
          Poți modifica preferințele oricând din{" "}
          <button type="button" onClick={() => navigate({ to: "/profile" })} className="onboarding-footer-link">
            Profil
          </button>
          .
        </p>
      </>
    );
  }

  return renderShell(
    <div className="onboarding-form-body">
      {mode === "ai" && (
        <AiMode onComplete={handleComplete} onBack={() => setMode("choose")} isSaving={isSaving} />
      )}

      {mode === "manual" && (
        <ManualMode onComplete={handleComplete} onBack={() => setMode("choose")} isSaving={isSaving} />
      )}

      {isSaving && mode !== "done" && (
        <div className="onboarding-saving-state">
          <div className="onboarding-spinner" />
          <div>Se salvează preferințele...</div>
        </div>
      )}

      {mode === "done" && <DoneScreen county={savedCounty} interests={savedInterests} />}
    </div>
  );
}
