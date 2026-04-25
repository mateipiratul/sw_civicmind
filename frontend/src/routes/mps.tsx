import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { api, type Parliamentarian } from "@/lib/api";

const PARTIES = ["Toate Partidele", "PSD", "PNL", "USR", "AUR", "UDMR", "ALDE", "Pro România"];

const VOTE_COLORS = {
  for: "#16a34a",
  against: "#dc2626",
  abstain: "#888",
  absent: "#ccc",
};

function scoreColor(score?: number | null) {
  if (!score) return "#aaa";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

function MPCard({ mp }: { mp: Parliamentarian }) {
  const s = mp.impact_score;
  const total = s?.total_votes || 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const forPct = pct(s?.for_count ?? 0);
  const againstPct = pct(s?.against_count ?? 0);
  const abstainPct = pct(s?.abstain_count ?? 0);
  const absentPct = pct(s?.absent_count ?? 0);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Name + party + county */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#111", lineHeight: 1.3 }}>{mp.mp_name}</div>
          {s?.score != null && (
            <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.score), flexShrink: 0 }}>
              {s.score.toFixed(1)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: "#f0f0f0", color: "#555" }}>
            {mp.party}
          </span>
          {mp.county && (
            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: "#f5f5f5", color: "#777" }}>
              {mp.county}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: "#f5f5f5", color: "#999" }}>
            {mp.chamber === "deputies" ? "Camera Deputaților" : mp.chamber === "senate" ? "Senat" : mp.chamber}
          </span>
        </div>
      </div>

      {/* Vote bar */}
      {total > 0 && (
        <div>
          <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", gap: 1 }}>
            <div style={{ width: `${forPct}%`, background: VOTE_COLORS.for }} />
            <div style={{ width: `${againstPct}%`, background: VOTE_COLORS.against }} />
            <div style={{ width: `${abstainPct}%`, background: VOTE_COLORS.abstain }} />
            <div style={{ width: `${absentPct}%`, background: VOTE_COLORS.absent }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {[
              { label: "Pentru", pct: forPct, color: VOTE_COLORS.for },
              { label: "Contra", pct: againstPct, color: VOTE_COLORS.against },
              { label: "Abținere", pct: abstainPct, color: VOTE_COLORS.abstain },
              { label: "Absent", pct: absentPct, color: VOTE_COLORS.absent },
            ].filter(v => v.pct > 0).map(v => (
              <span key={v.label} style={{ fontSize: 11, color: v.color, fontWeight: 500 }}>
                {v.label} {v.pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      {s?.narrative && (
        <p style={{ fontSize: 12.5, color: "#666", lineHeight: 1.55, margin: 0 }}>
          {s.narrative.length > 140 ? s.narrative.slice(0, 140) + "…" : s.narrative}
        </p>
      )}

      {/* Total votes */}
      {total > 0 && (
        <div style={{ fontSize: 11, color: "#bbb" }}>{total} voturi înregistrate</div>
      )}
    </div>
  );
}

function MPCardSkeleton() {
  return (
    <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ height: 16, width: "55%", background: "#f0f0f0", borderRadius: 4 }} />
        <div style={{ height: 22, width: 36, background: "#f0f0f0", borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ height: 20, width: 50, background: "#f5f5f5", borderRadius: 4 }} />
        <div style={{ height: 20, width: 70, background: "#f5f5f5", borderRadius: 4 }} />
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 99 }} />
      <div style={{ height: 36, background: "#f8f8f8", borderRadius: 4 }} />
    </div>
  );
}

function MPsPage() {
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("Toate Partidele");
  const [mps, setMps] = useState<Parliamentarian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async (searchVal: string, partyVal: string, pageVal: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.listMPs({
        search: searchVal || undefined,
        page: pageVal,
      });
      setMps(res.results);
      setCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcarea parlamentarilor");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search, party, page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, party, page, load]);

  const filtered = party === "Toate Partidele"
    ? mps
    : mps.filter(mp => mp.party === party);

  const totalPages = Math.ceil(count / pageSize);

  const selectStyle = {
    padding: "8px 32px 8px 12px",
    fontSize: 13,
    border: "1px solid #e2e2e2",
    borderRadius: 8,
    background: "white",
    color: "#111",
    outline: "none",
    cursor: "pointer",
    fontFamily: "var(--font)",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 10px center" as const,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 }}>Parlamentari</h1>
        <p style={{ fontSize: 13, color: "#888" }}>
          Lista parlamentarilor cu date agregate din prezența la vot și scorul de impact.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Caută după nume, partid sau județ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: 13,
              border: "1px solid #e2e2e2",
              borderRadius: 8,
              background: "white",
              color: "#111",
              outline: "none",
              fontFamily: "var(--font)",
            }}
          />
        </div>
        <select value={party} onChange={(e) => { setParty(e.target.value); setPage(1); }} style={selectStyle}>
          {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {count > 0 && (
          <span style={{ fontSize: 12.5, color: "#aaa", marginLeft: "auto" }}>
            {count} parlamentari
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {isLoading
          ? [...Array(12)].map((_, i) => <MPCardSkeleton key={i} />)
          : filtered.map(mp => <MPCard key={mp.mp_slug} mp={mp} />)
        }
        {!isLoading && filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 13 }}>
            Nu s-au găsit parlamentari.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "6px 14px", fontSize: 13, border: "1px solid #e2e2e2", borderRadius: 7, background: "white", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "#ccc" : "#111" }}
          >
            ←
          </button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "#555" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "6px 14px", fontSize: 13, border: "1px solid #e2e2e2", borderRadius: 7, background: "white", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "#ccc" : "#111" }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/mps")({
  component: MPsPage,
});
