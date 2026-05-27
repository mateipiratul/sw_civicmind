import type { ParliamentarianDetail } from "@/lib/api";

function scoreColor(score?: number | null) {
  if (score == null) return "#aaa";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

interface MPProfileHeaderProps {
  mp: ParliamentarianDetail;
}

export function MPProfileHeader({ mp }: MPProfileHeaderProps) {
  const s = mp.impact_score;
  const total = s?.total_votes ?? 0;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 10 }}>{mp.mp_name}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {mp.party && (
              <span className="span-partycounty">{mp.party}</span>
            )}
            {mp.county && (
              <span className="span-partycounty">{mp.county}</span>
            )}
            {mp.chamber && (
              <span className="span-partycounty">
                {mp.chamber === "deputies" ? "Camera Deputaților" : mp.chamber === "senate" ? "Senat" : mp.chamber}
              </span>
            )}
            {mp.email && (
              <a href={`mailto:${mp.email}`} className="span-partycounty" style={{ background: "#f0f8ff", color: "#2457d6", textDecoration: "none" }}>
                {mp.email}
              </a>
            )}
          </div>
        </div>
        {s?.score != null && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(s.score), lineHeight: 1 }}>
              {s.score.toFixed(0)}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>scor impact</div>
          </div>
        )}
      </div>

      {/* Vote bar */}
      {total > 0 && (
        <div style={{ marginBottom: s?.narrative ? 16 : 0 }}>
          <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 8 }}>
            <div style={{ width: `${pct(s!.for_count)}%`, background: "var(--color-success)" }} />
            <div style={{ width: `${pct(s!.against_count)}%`, background: "var(--color-destructive)" }} />
            <div style={{ width: `${pct(s!.abstain_count)}%`, background: "var(--color-muted-foreground)" }} />
            <div style={{ width: `${pct(s!.absent_count)}%`, background: "var(--color-input)" }} />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Pentru", n: s!.for_count, color: "var(--color-success)" },
              { label: "Contra", n: s!.against_count, color: "var(--color-destructive)" },
              { label: "Abținere", n: s!.abstain_count, color: "var(--color-muted-foreground)" },
              { label: "Absent", n: s!.absent_count, color: "var(--color-input)" },
            ].map(({ label, n, color }) => (
              <span key={label} style={{ fontSize: 12.5 }}>
                <span style={{ color, fontWeight: 700 }}>{pct(n)}%</span>
                <span className="muted" style={{ marginLeft: 4 }}>{label} ({n})</span>
              </span>
            ))}
            <span style={{ fontSize: 12, color: "#bbb", marginLeft: "auto" }}>{total} voturi total</span>
          </div>
        </div>
      )}

      {s?.narrative && (
        <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, margin: 0, paddingTop: total > 0 ? 0 : 4 }}>
          {s.narrative}
        </p>
      )}
    </div>
  );
}
