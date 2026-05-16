import { DetailSection } from "./detail-section";
import { Scale } from "lucide-react";
import type { Bill } from "@/lib/api";

interface BillImpactProps {
  bill: Bill;
}

export function BillImpact({ bill }: BillImpactProps) {
  const ai = bill.ai_analysis;

  return (
    <DetailSection
      eyebrow="Impact vizat"
      title="Categorii și Grupuri Afectate"
      icon={<Scale size={20} />}
    >
      <div className="flex flex-col gap-6">
        <div>
          <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 mb-3">
            Domenii de impact
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ai?.impact_categories?.length ? (
              ai.impact_categories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center px-3.5 py-2 rounded-full bg-gray-900 text-white text-[13px] font-semibold"
                >
                  {category}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">Fără categorii de impact identificate.</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 mb-3">
            Profiluri vizate
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ai?.affected_profiles?.length ? (
              ai.affected_profiles.map((profile) => (
                <span
                  key={profile}
                  className="inline-flex items-center px-3.5 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold"
                >
                  {profile}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">Nu au fost extrase profiluri specifice.</span>
            )}
          </div>
        </div>
      </div>
    </DetailSection>
  );
}
