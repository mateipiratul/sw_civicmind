import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useInterestAnalysis } from "@/lib/hooks/use-interest-analysis";
import { Button } from "@/components/ui/button";
import type { QuestionnaireOption } from "@/lib/api";

type AiStep = "input" | "confirm";

interface AiModeProps {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function AiMode({ onComplete, onBack, isSaving = false }: AiModeProps) {
  const [step, setStep] = useState<AiStep>("input");
  const [input, setInput] = useState("");
  const { analyze, isAnalyzing, error } = useInterestAnalysis();
  const [suggestion, setSuggestion] = useState<{ county: string | null; interests: string[] } | null>(null);
  const [confirmedInterests, setConfirmedInterests] = useState<string[]>([]);
  const [confirmedCounty, setConfirmedCounty] = useState<string | null>(null);
  const [interestOptions, setInterestOptions] = useState<QuestionnaireOption[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toInterestValue = (interest: string) =>
    interestOptions.find((option) => option.value === interest || option.label === interest)?.value ?? interest;

  const toInterestLabel = (interest: string) =>
    interestOptions.find((option) => option.value === interest || option.label === interest)?.label ?? interest;

  useEffect(() => {
    api.getQuestionnaireMetadata()
      .then((metadata) => {
        const options = metadata.impact_category_options?.length
          ? metadata.impact_category_options
          : metadata.impact_categories.map((category) => ({ value: category, label: category }));
        setInterestOptions(options);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === "input") {
      textareaRef.current?.focus();
    }
  }, [step]);

  const handleSend = async () => {
    const analysis = await analyze(input);
    if (analysis) {
      const normalizedInterests = Array.from(new Set(analysis.interests.map(toInterestValue)));
      setSuggestion({ county: analysis.county, interests: normalizedInterests });
      setConfirmedCounty(analysis.county);
      setConfirmedInterests(normalizedInterests);
      setStep("confirm");
    }
  };

  const toggleInterest = (cat: string) => {
    setConfirmedInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (step === "input") {
    return (
      <div className="onboarding-step-content">
        <button type="button" onClick={onBack} className="onboarding-back-button">
          <ArrowLeft size={15} /> Înapoi la opțiuni
        </button>

        <div className="onboarding-form-intro">
          <h2>Descrie ce te interesează</h2>
          <p>
            Spune câteva cuvinte despre oraș, profesie sau temele civice importante pentru tine. Vei confirma totul înainte de salvare.
          </p>
        </div>

        <div className="onboarding-ai-card">
          <label className="onboarding-field-label" htmlFor="onboarding-ai-input">
            Descriere scurtă
          </label>
          <div className="onboarding-textarea-wrap">
            <textarea
              id="onboarding-ai-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isAnalyzing || isSaving}
              placeholder="Ex: Sunt medic în Iași și mă preocupă sănătatea publică și mediul."
              rows={5}
              className="onboarding-textarea"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isAnalyzing || isSaving}
              className="onboarding-send-button"
              aria-label="Analizează descrierea"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="onboarding-ai-helper">
            <Sparkles size={15} />
            <span>AI-ul propune, tu confirmi. Nu salvăm nimic până nu apeși butonul final.</span>
          </div>
        </div>

        {isAnalyzing && (
          <div className="onboarding-inline-status">
            <Sparkles size={16} />
            Se analizează descrierea ta...
          </div>
        )}

        {error && <div className="onboarding-form-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="onboarding-step-content">
      <button type="button" onClick={() => setStep("input")} className="onboarding-back-button">
        <RotateCcw size={15} /> Rescrie descrierea
      </button>

      <div className="onboarding-ai-summary">
        <div className="onboarding-ai-summary-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>Am extras o propunere de profil.</strong>
          <p>
            {suggestion?.county ? (
              <>
                Județ detectat: <span>{suggestion.county}</span>.{" "}
              </>
            ) : (
              "Nu am detectat un județ. "
            )}
            {suggestion?.interests?.length ? (
              <>
                Interese: <span>{suggestion.interests.map(toInterestLabel).join(", ")}</span>.
              </>
            ) : (
              "Alege manual interesele de mai jos."
            )}
          </p>
        </div>
      </div>

      {confirmedCounty && (
        <div className="onboarding-detected-county">
          <span>Județ detectat</span>
          <button type="button" onClick={() => setConfirmedCounty(null)} title="Elimină județul">
            {confirmedCounty}
            <X size={14} />
          </button>
        </div>
      )}

      <div className="onboarding-field-card">
        <div className="onboarding-field-header">
          <label className="onboarding-field-label">Confirmă interesele</label>
          <span>{confirmedInterests.length} selectate</span>
        </div>

        <div className="onboarding-interest-grid">
          {interestOptions.map((option) => {
            const active = confirmedInterests.includes(option.value);
            const wasSuggested = suggestion?.interests?.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleInterest(option.value)}
                className={`onboarding-interest-chip ${active ? "is-selected" : ""} ${wasSuggested ? "was-suggested" : ""}`}
              >
                {active && <Check size={14} />}
                {option.label}
                {wasSuggested && !active && <span className="onboarding-suggested-dot">AI</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="onboarding-actions-row">
        <Button
          onClick={() => onComplete(confirmedCounty, confirmedInterests)}
          disabled={isSaving || (confirmedInterests.length === 0 && !confirmedCounty)}
          className="onboarding-primary-action"
        >
          {isSaving ? "Se salvează..." : "Salvează și vezi feed-ul"}
          <Check size={18} />
        </Button>
        <p className="onboarding-action-note">Poți modifica selecția oricând din Profil.</p>
      </div>
    </div>
  );
}
