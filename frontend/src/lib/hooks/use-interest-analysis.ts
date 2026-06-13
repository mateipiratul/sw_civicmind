import { useState } from "react";
import { api } from "@/lib/api";

export interface InterestAnalysisResult {
  county: string | null;
  interests: string[];
}

export function useInterestAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (text: string): Promise<InterestAnalysisResult | null> => {
    const trimmedText = text.trim();
    if (!trimmedText) return null;

    setIsAnalyzing(true);
    setError(null);
    try {
      const metadata = await api.getQuestionnaireMetadata();
      const analysis = await api.analyzeOnboardingProfile(
        trimmedText,
        metadata.counties,
        metadata.impact_categories
      );
      return {
        county: analysis.county ?? null,
        interests: analysis.interests ?? [],
      };
    } catch {
      setError("Nu am putut analiza descrierea. Încearcă din nou.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyze,
    isAnalyzing,
    error,
    setError,
  };
}
