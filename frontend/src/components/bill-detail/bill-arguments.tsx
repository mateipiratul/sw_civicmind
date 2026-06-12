import { DetailSection } from "./detail-section";
import { MessageSquareText, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Bill } from "@/lib/api";
import { Markdown } from "@/components/ui/markdown";
import { cleanText } from "@/lib/utils";

interface BillArgumentsProps {
  bill: Bill;
}

export function BillArguments({ bill }: BillArgumentsProps) {
  const ai = bill.ai_analysis;

  return (
    <DetailSection
      eyebrow="Analiză dezbatere"
      title="Argumente Pro și Contra"
      icon={<MessageSquareText size={20} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div style={{ 
          borderRadius: "16px", 
          border: "1px solid color-mix(in srgb, var(--color-success) 20%, transparent)", 
          background: "color-mix(in srgb, var(--color-success) 5%, white)", 
          padding: "24px" 
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "10px", 
            color: "var(--color-success)", 
            fontWeight: 700, 
            fontSize: "11px", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em", 
            marginBottom: "16px" 
          }}>
            <ShieldCheck size={18} />
            Argumente PRO
          </div>
          {ai?.pro_arguments?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ai.pro_arguments.map((argument, index) => (
                <Markdown key={`${index}-${argument}`} content={cleanText(argument)} className="text-[14.5px] leading-relaxed text-gray-800" />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-muted)", fontStyle: "italic" }}>
              Nu au fost extrase argumente de susținere.
            </p>
          )}
        </div>

        <div style={{ 
          borderRadius: "16px", 
          border: "1px solid color-mix(in srgb, var(--color-destructive) 20%, transparent)", 
          background: "color-mix(in srgb, var(--color-destructive) 5%, white)", 
          padding: "24px" 
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "10px", 
            color: "var(--color-destructive)", 
            fontWeight: 700, 
            fontSize: "11px", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em", 
            marginBottom: "16px" 
          }}>
            <ShieldAlert size={18} />
            Argumente CONTRA
          </div>
          {ai?.con_arguments?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ai.con_arguments.map((argument, index) => (
                <Markdown key={`${index}-${argument}`} content={cleanText(argument)} className="text-[14.5px] leading-relaxed text-gray-800" />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-muted)", fontStyle: "italic" }}>
              Nu au fost extrase critici pentru acest proiect.
            </p>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
