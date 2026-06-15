import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { QuestionnaireMetadata, QuestionnaireOption } from "@/lib/api";

interface ManualModeProps {
  onComplete: (county: string | null, interests: string[]) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function ManualMode({ onComplete, onBack, isSaving = false }: ManualModeProps) {
  const [metadata, setMetadata] = useState<QuestionnaireMetadata | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [county, setCounty] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const interestOptions: QuestionnaireOption[] =
    metadata?.impact_category_options?.length
      ? metadata.impact_category_options
      : metadata?.personal_interest_areas?.length
        ? metadata.personal_interest_areas
        : (metadata?.impact_categories || []).map((category) => ({ value: category, label: category }));

  useEffect(() => {
    let cancelled = false;
    setMetadataError(false);

    api.getQuestionnaireMetadata()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadataError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const toggle = (cat: string) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const isLoading = !metadata && !metadataError;
  const canContinue = Boolean(metadata && !metadataError && !isSaving && (county || selected.length > 0));

  return (
    <div className="onboarding-step-content">
      <button type="button" onClick={onBack} className="onboarding-back-button">
        <ArrowLeft size={15} /> Înapoi la opțiuni
      </button>

      <div className="onboarding-form-intro">
        <h2>Selectează preferințele</h2>
        <p>
          Alege județul și domeniile care contează pentru tine. Le folosim pentru a ordona feed-ul, nu pentru a ascunde legi.
        </p>
      </div>

      {metadataError && (
        <div className="onboarding-form-error">
          <div className="onboarding-form-error-title">Nu am putut încărca opțiunile.</div>
          <p>Verifică dacă ești autentificat și încearcă din nou.</p>
          <button
            type="button"
            onClick={() => {
              setMetadata(null);
              setReloadKey((key) => key + 1);
            }}
            className="onboarding-retry-button"
          >
            <RefreshCcw size={14} />
            Reîncarcă
          </button>
        </div>
      )}

      <div className="onboarding-field-card">
        <label className="onboarding-field-label">Județ de interes</label>
        {isLoading ? (
          <div className="onboarding-skeleton-line" />
        ) : metadata ? (
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="onboarding-select"
          >
            <option value="">Alege județul, dacă vrei relevanță locală</option>
            {metadata.counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
        <p className="onboarding-field-help">Opțional, dar util pentru legi și parlamentari locali.</p>
      </div>

      <div className="onboarding-field-card">
        <div className="onboarding-field-header">
          <label className="onboarding-field-label">Interese civice</label>
          <span>{selected.length} selectate</span>
        </div>

        {isLoading ? (
          <div className="onboarding-chip-skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="onboarding-chip-skeleton" />
            ))}
          </div>
        ) : metadata ? (
          <div className="onboarding-interest-grid">
            {interestOptions.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={`onboarding-interest-chip ${active ? "is-selected" : ""}`}
                >
                  {active && <Check size={14} />}
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="onboarding-actions-row">
        <Button
          onClick={() => onComplete(county || null, selected)}
          disabled={!canContinue}
          className="onboarding-primary-action"
        >
          {isSaving ? "Se salvează..." : "Salvează și vezi feed-ul"}
          <ArrowRight size={18} />
        </Button>
        <p className="onboarding-action-note">Poți reveni oricând în Profil pentru ajustări.</p>
      </div>
    </div>
  );
}
