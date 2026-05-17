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
    <div style={{ width: "100%", background: "white", border: "1px solid #e8e8e8", borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: expanded ? 14 : 0, cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{mp.mp_name}</span>
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
              <span style={{ fontSize: 13, color: "#ccc" }}>
                {mp.chamber === "deputies" ? "Deputat" : mp.chamber === "senate" ? "Senator" : mp.chamber}
              </span>
            )}
            {t > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{t} voturi</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {s?.score != null && (
            <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.score) }}>
              {s.score.toFixed(0)}
            </span>
          )}
          <span style={{ color: "#ccc", display: "flex" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {expanded && <div>
        {s && t > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 8 }}>
              <div style={{ width: `${pct(s.for_count)}%`, background: "#16a34a" }} />
              <div style={{ width: `${pct(s.against_count)}%`, background: "#dc2626" }} />
              <div style={{ width: `${pct(s.abstain_count)}%`, background: "#888" }} />
              <div style={{ width: `${pct(s.absent_count)}%`, background: "#ddd" }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Pentru", n: s.for_count, color: "#16a34a" },
                { label: "Contra", n: s.against_count, color: "#dc2626" },
                { label: "Abținere", n: s.abstain_count, color: "#888" },
                { label: "Absent", n: s.absent_count, color: "#bbb" },
              ].map(({ label, n, color }) => (
                <span key={label} style={{ fontSize: 13 }}>
                  <span style={{ color, fontWeight: 600 }}>{pct(n)}%</span>
                  <span style={{ color: "#bbb", marginLeft: 4 }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {s?.narrative && (
          <p style={{ fontSize: 14.5, color: "#555", lineHeight: 1.65, margin: "0 0 14px" }}>{s.narrative}</p>
        )}

        <Link
          to="/mps/$slug"
          params={{ slug: mp.mp_slug }}
          onClick={e => e.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "#111", textDecoration: "none", fontWeight: 600 }}
        >
          Profil complet <ExternalLink size={13} />
        </Link>
      </div>}
    </div>
  );
}
