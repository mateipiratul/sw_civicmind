import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { MPRow } from "./mp-row";
import { MPRowSkeleton } from "./mp-row-skeleton";
import { MPFilters } from "./mp-filters";

export function MPsPage() {
  const { user } = useAuth();
  const [tab] = useState<"all" | "mine">("all");
  const [party, setParty] = useState("");
  const [county, setCounty] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Metadata Query
  const metadataQuery = useQuery({
    queryKey: ["mps-metadata"],
    queryFn: () => api.getMPMetadata(),
  });

  // MPs Query
  const mpsQuery = useQuery({
    queryKey: ["mps-list", tab, party, county, page, user?.county],
    queryFn: () => {
      if (tab === "mine" && user?.county) {
        return api.getMyRepresentatives(user.county, { page, limit: pageSize });
      } else {
        return api.listMPs({ 
          party: party || undefined, 
          county: county || undefined, 
          page, 
          limit: pageSize 
        });
      }
    },
  });

  const metadata = metadataQuery.data;
  const mpsData = mpsQuery.data;
  const mps = useMemo(() => mpsData?.parliamentarians || [], [mpsData]);
  const total = mpsData?.total || 0;
  const loading = mpsQuery.isLoading;
  const error = mpsQuery.error instanceof Error ? mpsQuery.error.message : null;

  const totalPages = Math.ceil(total / pageSize);

  const partyOptions = useMemo(
    () => [...new Set([...(metadata?.parties ?? []), ...mps.map(mp => mp.party).filter(Boolean)])].sort(),
    [metadata?.parties, mps],
  );
  const countyOptions = metadata?.counties ?? [];

  const handleReset = () => {
    setParty("");
    setCounty("");
    setPage(1);
  };

  return (
    <div style={{ width: "100%", maxWidth: 850, margin: "0 auto", padding: "40px 60px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111" }}>Parlamentari</h1>
        {total > 0 && <span className="muted" style={{ fontSize: 14.5 }}>{total} rezultate</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
        {tab === "all" && (
          <MPFilters 
            party={party}
            setParty={(p) => { setParty(p); setPage(1); }}
            county={county}
            setCounty={(c) => { setCounty(c); setPage(1); }}
            partyOptions={partyOptions}
            countyOptions={countyOptions}
            onReset={handleReset}
          />
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
