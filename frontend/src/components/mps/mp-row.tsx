import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Parliamentarian } from "@/lib/api";
import { cleanText, extractBillTitleAndBody } from "@/lib/utils";

function scoreColor(score?: number | null) {
  if (score == null) return "var(--text-muted)";
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-warning)";
  return "var(--color-destructive)";
}

interface MPRowProps {
  mp: Parliamentarian;
}

export function MPRow({ mp }: MPRowProps) {
  const [expanded, setExpanded] = useState(false);
  const s = mp.impact_score;
  const t = s?.total_votes ?? 0;
  const pct = (n: number) => t > 0 ? Math.round((n / t) * 100) : 0;

  return (
    <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", transition: "box-shadow 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{cleanText(mp.mp_name)}</span>
            {mp.party?.trim() && (
              <span className="span-partycounty">
                {mp.party}
              </span>
            )}
            {mp.county?.trim() && (
              <span className="span-partycounty">
                {mp.county}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {mp.chamber && (
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                {mp.chamber === "deputies" ? "Deputat" : mp.chamber === "senate" ? "Senator" : mp.chamber}
              </span>
            )}
            {t > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{t} voturi</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {s?.score != null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor(s.score), minWidth: 32, textAlign: "right" }}>
              {s.score.toFixed(0)}
            </span>
          )}
          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", padding: "2px 4px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid var(--border)" }}>
          {s && t > 0 && (
            <div style={{ marginBottom: 14, paddingTop: 16 }}>
              <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 10 }}>
                <div style={{ width: `${pct(s.for_count)}%`, background: "var(--color-success)" }} />
                <div style={{ width: `${pct(s.against_count)}%`, background: "var(--color-destructive)" }} />
                <div style={{ width: `${pct(s.abstain_count)}%`, background: "var(--color-muted-foreground)" }} />
                <div style={{ width: `${pct(s.absent_count)}%`, background: "var(--color-input)" }} />
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {[
                  { label: "Pentru", n: s.for_count, color: "var(--color-success)" },
                  { label: "Contra", n: s.against_count, color: "var(--color-destructive)" },
                  { label: "Abținere", n: s.abstain_count, color: "var(--color-muted-foreground)" },
                  { label: "Absent", n: s.absent_count, color: "var(--color-input)" },
                ].map(({ label, n, color }) => (
                  <span key={label} style={{ fontSize: 12.5 }}>
                    <span style={{ color, fontWeight: 700 }}>{pct(n)}%</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>{label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {s?.narrative && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 14px" }}>{s.narrative}</p>
          )}

          <Link
            to="/mps/$slug"
            params={{ slug: mp.mp_slug }}
            onClick={e => e.stopPropagation()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", textDecoration: "none", fontWeight: 600, padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", transition: "background 0.12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--primary)"; (e.currentTarget as HTMLElement).style.color = "var(--primary-text)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            Profil complet <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

