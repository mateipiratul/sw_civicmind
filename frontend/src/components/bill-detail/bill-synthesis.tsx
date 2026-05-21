import { DetailSection } from "./detail-section";
import { Sparkles } from "lucide-react";
import type { Bill } from "@/lib/api";

interface BillSynthesisProps {
  bill: Bill;
}

export function BillSynthesis({ bill }: BillSynthesisProps) {
  const ai = bill.ai_analysis;

  return (
    <DetailSection
      eyebrow="Sinteză AI"
      title="Ce prevede acest proiect"
      icon={<Sparkles size={20} />}
    >
      {ai?.key_ideas?.length ? (
        <div className="flex flex-col gap-3.5">
          {ai.key_ideas.map((idea, index) => (
            <div
              key={`${index}-${idea}`}
              className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-[15px] leading-relaxed text-gray-700">{idea}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm leading-relaxed text-gray-500 text-center">
          Rezumatul AI nu a fost încă generat. Documentele oficiale sunt disponibile în panoul lateral.
        </div>
      )}
    </DetailSection>
  );
}
