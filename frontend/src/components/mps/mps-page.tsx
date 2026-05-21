import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { MPRow } from "./mp-row";
import { MPRowSkeleton } from "./mp-row-skeleton";
import { MPFilters } from "./mp-filters";
import { RightSidebar } from "@/components/feed/right-sidebar";

export function MPsPage() {
  const { user, isAuthenticated } = useAuth();
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

  // Local MPs Query (for sidebar)
  const localMPsQuery = useQuery({
    queryKey: ["local-mps", user?.county],
    queryFn: () => api.listMPs({ county: user?.county, limit: 5 }),
    enabled: !!user?.county,
  });

  // Trending Bills Query (for sidebar)
  const trendingBillsQuery = useQuery({
    queryKey: ["trending-bills-sidebar"],
    queryFn: () => api.listBills(undefined, 1, 5),
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

  const localMPs = localMPsQuery.data?.parliamentarians.slice(0, 5) || [];
  const trendingBills = trendingBillsQuery.data?.bills || [];

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
      {/* Main content */}
      <main style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>
              Parlamentari
            </h1>
            {total > 0 && <span className="muted" style={{ fontSize: 13.5, color: "#666" }}>{total} rezultate</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
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
            <div className="error-box" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading
              ? [...Array(12)].map((_, i) => <MPRowSkeleton key={i} />)
              : mps.length === 0
              ? <div className="muted" style={{ textAlign: "center", padding: "48px 0", fontSize: 13 }}>
                  {tab === "mine" ? "Nu am găsit parlamentari din județul tău." : "Nu s-au găsit parlamentari."}
                </div>
              : mps.map(mp => <MPRow key={mp.mp_slug} mp={mp} />)
            }
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
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
      </main>

      {/* Right panel */}
      <RightSidebar 
        isAuthenticated={isAuthenticated}
        user={user}
        localMPs={localMPs}
        trendingBills={trendingBills}
      />
    </div>
  );
}
