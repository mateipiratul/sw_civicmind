import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { api, type Parliamentarian, type MPMetadata } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/mps/")({
  component: MPsPage,
});

function scoreColor(score?: number | null) {
  if (score == null) return "#aaa";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

function MPRow({ mp }: { mp: Parliamentarian }) {
  const [expanded, setExpanded] = useState(false);
  const s = mp.impact_score;
  const t = s?.total_votes ?? 0;
  const pct = (n: number) => t > 0 ? Math.round((n / t) * 100) : 0;

  return (
    <div style={{ width: "100%", background: "white", border: "1px solid #e8e8e8", borderRadius: 8, padding: "14px 16px", marginBottom: 6 }}>
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: expanded ? 10 : 0, cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{mp.mp_name}</span>
            {mp.party && (
              <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 3, background: "#f0f0f0", color: "#555", fontWeight: 500 }}>
                {mp.party}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {mp.county && <span className="muted" style={{ fontSize: 12 }}>{mp.county}</span>}
            <span style={{ fontSize: 12, color: "#ccc" }}>
              {mp.chamber === "deputies" ? "Deputat" : mp.chamber === "senate" ? "Senator" : mp.chamber}
            </span>
            {t > 0 && <span className="muted" style={{ fontSize: 11.5 }}>{t} voturi</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {s?.score != null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor(s.score) }}>
              {s.score.toFixed(0)}
            </span>
          )}
          <span style={{ color: "#ccc", display: "flex" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {expanded && <div>
        {s && t > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 6 }}>
              <div style={{ width: `${pct(s.for_count)}%`, background: "#16a34a" }} />
              <div style={{ width: `${pct(s.against_count)}%`, background: "#dc2626" }} />
              <div style={{ width: `${pct(s.abstain_count)}%`, background: "#888" }} />
              <div style={{ width: `${pct(s.absent_count)}%`, background: "#ddd" }} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Pentru", n: s.for_count, color: "#16a34a" },
                { label: "Contra", n: s.against_count, color: "#dc2626" },
                { label: "Abținere", n: s.abstain_count, color: "#888" },
                { label: "Absent", n: s.absent_count, color: "#bbb" },
              ].map(({ label, n, color }) => (
                <span key={label} style={{ fontSize: 11.5 }}>
                  <span style={{ color, fontWeight: 600 }}>{pct(n)}%</span>
                  <span style={{ color: "#bbb", marginLeft: 3 }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {s?.narrative && (
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 10px" }}>{s.narrative}</p>
        )}

        <Link
          to="/mps/$slug"
          params={{ slug: mp.mp_slug }}
          onClick={e => e.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#333", textDecoration: "none", fontWeight: 600 }}
        >
          Profil complet <ExternalLink size={11} />
        </Link>
      </div>}
    </div>
  );
}

function MPRowSkeleton() {
  return (
    <div style={{ width: "100%", background: "white", border: "1px solid #e8e8e8", borderRadius: 8, padding: "14px 16px", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ height: 14, width: 150, background: "#f0f0f0", borderRadius: 3 }} />
            <div style={{ height: 18, width: 40, background: "#f5f5f5", borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ height: 12, width: 70, background: "#f5f5f5", borderRadius: 3 }} />
            <div style={{ height: 12, width: 55, background: "#f5f5f5", borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ height: 18, width: 28, background: "#f0f0f0", borderRadius: 3 }} />
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 99, marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 12 }}>
        {[40, 40, 50, 40].map((w, i) => <div key={i} style={{ height: 11, width: w, background: "#f5f5f5", borderRadius: 3 }} />)}
      </div>
    </div>
  );
}

function MPsPage() {
  const { user, isAuthenticated } = useAuth();
  const [metadata, setMetadata] = useState<MPMetadata | null>(null);
  const [mps, setMps] = useState<Parliamentarian[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("");
  const [county, setCounty] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    api.getMPMetadata().then(setMetadata).catch(() => {});
  }, []);

  const load = useCallback(async (tabVal: string, searchVal: string, partyVal: string, countyVal: string, pageVal: number) => {
    setLoading(true);
    setError(null);
    try {
      if (tabVal === "mine" && user?.county) {
        const res = await api.getMyRepresentatives(user.county, { page: pageVal, limit: pageSize });
        setMps(res.parliamentarians);
        setTotal(res.total);
      } else {
        const res = await api.listMPs({ search: searchVal || undefined, party: partyVal || undefined, county: countyVal || undefined, page: pageVal, limit: pageSize });
        setMps(res.parliamentarians);
        setTotal(res.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcarea parlamentarilor");
    } finally {
      setLoading(false);
    }
  }, [user?.county]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(tab, search, party, county, page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, search, party, county, page, load]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = search || party || county;
  const partyOptions = useMemo(
    () => [...new Set([...(metadata?.parties ?? []), ...mps.map(mp => mp.party).filter(Boolean)])].sort(),
    [metadata?.parties, mps],
  );
  const countyOptions = metadata?.counties ?? [];

  const selectStyle = {
    padding: "7px 28px 7px 10px", fontSize: 12.5,
    border: "1px solid #e2e2e2", borderRadius: 7,
    background: "white", color: "#111", outline: "none", cursor: "pointer",
    fontFamily: "inherit", appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const, backgroundPosition: "right 8px center",
  };

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>Parlamentari</h1>
        {total > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{total} rezultate</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: "Toți" },
            ...(isAuthenticated && user?.county ? [{ id: "mine", label: `Județul ${user.county}` }] : []),
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as "all" | "mine"); setPage(1); }}
              style={{
                padding: "5px 12px", fontSize: 12.5, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${tab === t.id ? "#111" : "#e2e2e2"}`,
                background: tab === t.id ? "#111" : "white",
                color: tab === t.id ? "white" : "#555",
                fontFamily: "inherit", fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "all" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Caută după nume..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: "100%", padding: "7px 10px 7px 28px", fontSize: 12.5,
                  border: "1px solid #e2e2e2", borderRadius: 7,
                  background: "white", color: "#111", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <select value={party} onChange={e => { setParty(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="">Toate partidele</option>
              {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {countyOptions.length > 0 && (
              <select value={county} onChange={e => { setCounty(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">Toate județele</option>
                {countyOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setParty(""); setCounty(""); setPage(1); }}
                className="muted"
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 6px" }}
              >
                <X size={12} /> Resetează
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 14, fontSize: 12.5, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div>
        {loading
          ? [...Array(12)].map((_, i) => <MPRowSkeleton key={i} />)
          : mps.length === 0
          ? <div className="muted" style={{ textAlign: "center", padding: "40px 0", fontSize: 13 }}>
              {tab === "mine" ? "Nu am găsit parlamentari din județul tău." : "Nu s-au găsit parlamentari."}
            </div>
          : mps.map(mp => <MPRow key={mp.mp_slug} mp={mp} />)
        }
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "5px 12px", fontSize: 12.5, border: "1px solid #e2e2e2", borderRadius: 6, background: "white", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "#ccc" : "#111", fontFamily: "inherit" }}
          >←</button>
          <span style={{ fontSize: 12.5, color: "#666" }}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "5px 12px", fontSize: 12.5, border: "1px solid #e2e2e2", borderRadius: 6, background: "white", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "#ccc" : "#111", fontFamily: "inherit" }}
          >→</button>
        </div>
      )}
    </div>
  );
}
