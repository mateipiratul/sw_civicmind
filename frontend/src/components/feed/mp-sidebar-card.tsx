import { Link } from "@tanstack/react-router";
import type { Parliamentarian } from "@/lib/api";
import { cleanText } from "@/lib/utils";

interface MPSidebarCardProps {
  mp: Parliamentarian;
}

export function MPSidebarCard({ mp }: MPSidebarCardProps) {
  const s = mp.impact_score;
  const total = s?.total_votes ?? 0;
  const forPct = total > 0 ? Math.round(((s?.for_count ?? 0) / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round(((s?.absent_count ?? 0) / total) * 100) : 0;

  return (
    <Link to="/mps/$slug" params={{ slug: mp.mp_slug }} style={{ textDecoration: "none" }}>
      <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{cleanText(mp.mp_name)}</div>
          {s?.score != null && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>{s.score.toFixed(0)}</div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: total > 0 ? 7 : 0 }}>
          {mp.party} · {mp.chamber === "deputies" ? "Deputat" : "Senator"}
        </div>
        {total > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--color-success)" }}>✓ {forPct}%</span>
            <span style={{ fontSize: 11, color: "var(--color-input)" }}>Absent {absentPct}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}
