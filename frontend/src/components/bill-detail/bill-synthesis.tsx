import { DetailSection } from "./detail-section";
import { Sparkles, AlertCircle } from "lucide-react";
import type { Bill } from "@/lib/api";
import { Markdown } from "@/components/ui/markdown";
import { cleanText } from "@/lib/utils";

interface BillSynthesisProps {
  bill: Bill;
}

export function BillSynthesis({ bill }: BillSynthesisProps) {
  const ai = bill.ai_analysis;
  const isLowQuality = ai?.ocr_quality?.toLowerCase() === "low" || ai?.confidence !== null && ai?.confidence !== undefined && ai.confidence < 0.6;

  return (
    <DetailSection
      eyebrow="Sinteză AI"
      title="Ce prevede acest proiect"
      icon={<Sparkles size={20} />}
    >
      <div className="flex flex-col gap-4">
        {isLowQuality && (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "10px", 
            padding: "12px 16px", 
            borderRadius: "10px", 
            background: "color-mix(in srgb, var(--color-warning) 10%, white)", 
            border: "1px solid var(--color-warning)",
            color: "var(--color-warning)",
            fontSize: "13px",
            fontWeight: 500
          }}>
            <AlertCircle size={18} />
            Documentele sursă au o calitate scăzută a scanării. Rezumatul poate conține mici erori.
          </div>
        )}

        {ai?.key_ideas?.length ? (
          <div className="flex flex-col gap-3.5">
            {ai.key_ideas.map((idea, index) => (
              <div
                key={`${index}-${idea}`}
                style={{
                  display: "flex",
                  gap: "16px",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)"
                }}
              >
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  background: "var(--surface)", 
                  border: "1px solid var(--border)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "var(--text-muted)", 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  flexShrink: 0 
                }}>
                  {index + 1}
                </div>
                <Markdown content={cleanText(idea)} className="text-[15px] leading-relaxed text-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: "20px", 
            borderRadius: "12px", 
            border: "1px dashed var(--border)", 
            background: "var(--bg)", 
            fontSize: "14px", 
            lineHeight: 1.6, 
            color: "var(--text-muted)", 
            textAlign: "center" 
          }}>
            Rezumatul AI nu a fost încă generat. Documentele oficiale sunt disponibile în panoul lateral.
          </div>
        )}
      </div>
    </DetailSection>
  );
}
