import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Parliamentarian } from "@/lib/api";

function scoreColor(score?: number | null) {
  if (score == null) return "#aaa";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
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
    <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: expanded ? 14 : 0, cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{mp.mp_name}</span>
            {mp.party?.trim() && (
              <span className="span-partycounty" style={{ fontSize: 13 }}>
                {mp.party}
              </span>
            )}
            {mp.county?.trim() && (
              <span className="span-partycounty" style={{ fontSize: 13 }}>
                {mp.county}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {mp.chamber && (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {mp.chamber === "deputies" ? "Deputat" : mp.chamber === "senate" ? "Senator" : mp.chamber}
              </span>
            )}
            {t > 0 && <span className="muted" style={{ fontSize: 13 }}>{t} voturi</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {s?.score != null && (
            <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.score) }}>
              {s.score.toFixed(0)}
            </span>
          )}
          <span style={{ color: "var(--color-input)", display: "flex" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {expanded && <div>
        {s && t > 0 && (
          <div style={{ marginBottom: 16, marginTop: 4 }}>
            <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 8 }}>
              <div style={{ width: `${pct(s.for_count)}%`, background: "var(--color-success)" }} />
              <div style={{ width: `${pct(s.against_count)}%`, background: "var(--color-destructive)" }} />
              <div style={{ width: `${pct(s.abstain_count)}%`, background: "var(--color-muted-foreground)" }} />
              <div style={{ width: `${pct(s.absent_count)}%`, background: "var(--color-input)" }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Pentru", n: s.for_count, color: "var(--color-success)" },
                { label: "Contra", n: s.against_count, color: "var(--color-destructive)" },
                { label: "Abținere", n: s.abstain_count, color: "var(--color-muted-foreground)" },
                { label: "Absent", n: s.absent_count, color: "var(--color-input)" },
              ].map(({ label, n, color }) => (
                <span key={label} style={{ fontSize: 13 }}>
                  <span style={{ color, fontWeight: 600 }}>{pct(n)}%</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {s?.narrative && (
          <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 16px" }}>{s.narrative}</p>
        )}

        <Link
          to="/mps/$slug"
          params={{ slug: mp.mp_slug }}
          onClick={e => e.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--text)", textDecoration: "none", fontWeight: 600 }}
        >
          Profil complet <ExternalLink size={13} />
        </Link>
      </div>}
    </div>
  );
}
