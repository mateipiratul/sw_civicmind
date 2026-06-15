import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface DoneScreenProps {
  county: string | null;
  interests: string[];
}

export function DoneScreen({ county, interests }: DoneScreenProps) {
  const [interestLabels, setInterestLabels] = useState<Record<string, string>>({});
  const displayInterests = interests.map((interest) => interestLabels[interest] ?? interest);
  const summary = [county, ...displayInterests.slice(0, 2)].filter(Boolean).join(", ");
  const hasMore = interests.length > 2;

  useEffect(() => {
    let cancelled = false;

    api.getQuestionnaireMetadata()
      .then((metadata) => {
        if (cancelled) return;
        setInterestLabels(
          Object.fromEntries(metadata.impact_category_options.map((option) => [option.value, option.label]))
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="onboarding-done-screen">
      <div className="onboarding-done-icon">
        <CheckCircle2 size={34} />
      </div>
      <h2>Profil configurat</h2>
      <p>
        {county || interests.length > 0 ? (
          <>
            Am salvat preferințele tale: <strong>{summary}</strong>
            {hasMore && <span> și altele</span>}.
          </>
        ) : (
          "Poți seta preferințele oricând din pagina de Profil."
        )}
      </p>

      <div className="onboarding-redirect-note">
        <span />
        Te trimitem către feed-ul personalizat...
      </div>
    </div>
  );
}
