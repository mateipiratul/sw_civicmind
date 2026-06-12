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
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <div style={{ 
            fontSize: "10.5px", 
            fontWeight: 700, 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em", 
            marginBottom: "12px" 
          }}>
            Domenii de impact
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {ai?.impact_categories?.length ? (
              ai.impact_categories.map((category) => (
                <span
                  key={category}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    background: "var(--primary)",
                    color: "var(--primary-text)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {category}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "14px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Fără categorii de impact identificate.
              </span>
            )}
          </div>
        </div>

        <div>
          <div style={{ 
            fontSize: "10.5px", 
            fontWeight: 700, 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em", 
            marginBottom: "12px" 
          }}>
            Profiluri vizate
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {ai?.affected_profiles?.length ? (
              ai.affected_profiles.map((profile) => (
                <span
                  key={profile}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    background: "var(--color-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {profile}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "14px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Nu au fost extrase profiluri specifice.
              </span>
            )}
          </div>
        </div>
      </div>
    </DetailSection>
  );
}
