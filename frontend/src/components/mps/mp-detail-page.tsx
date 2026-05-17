import { useMemo } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { VoteRow } from "./vote-row";
import { MPProfileHeader } from "./mp-profile-header";

export function MPDetailPage() {
  const { slug } = useParams({ from: "/mps/$slug" });
  const { q, billIds, billNumbers } = useSearch({ from: "/mps/$slug" });
  
  const filterQuery = q ?? "";
  const billIdsParam = billIds ?? "";
  const billNumbersParam = billNumbers ?? "";
  
  const filteredBillIds = useMemo(
    () =>
      billIdsParam
        .split(",")
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    [billIdsParam],
  );
  
  const filteredBillNumbers = useMemo(
    () => billNumbersParam.split(",").map((item) => item.trim()).filter(Boolean),
    [billNumbersParam],
  );
  
  const isFilteredHistory = filterQuery.length > 0 && (filteredBillNumbers.length > 0 || filteredBillIds.length > 0);

  const mpQuery = useQuery({
    queryKey: ["mp-detail", slug, filteredBillIds, filteredBillNumbers],
    queryFn: () => api.getMPDetail(slug, { billIds: filteredBillIds, billNumbers: filteredBillNumbers }),
  });

  const mp = mpQuery.data;
  const loading = mpQuery.isLoading;
  const error = mpQuery.error instanceof Error ? mpQuery.error.message : null;

  if (loading) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ height: 16, width: 120, background: "#f0f0f0", borderRadius: 4, marginBottom: 24 }} />
      <div style={{ height: 28, width: "40%", background: "#f0f0f0", borderRadius: 4, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[60, 80, 90].map(w => <div key={w} style={{ height: 22, width: w, background: "#f5f5f5", borderRadius: 4 }} />)}
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 99, marginBottom: 20 }} />
      <div style={{ height: 48, background: "#f8f8f8", borderRadius: 8 }} />
    </div>
  );

  if (error || !mp) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <Link to="/mps" className="muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
        <ChevronLeft size={14} /> Parlamentari
      </Link>
      <p style={{ color: "#dc2626", fontSize: 13 }}>{error || "Parlamentarul nu a fost găsit."}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back */}
      <Link to="/mps" className="muted" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24, textDecoration: "none" }}>
        <ChevronLeft size={14} /> Toți parlamentarii
      </Link>

      {/* Profile header */}
      <MPProfileHeader mp={mp} />

      {/* Vote history */}
      <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
            {isFilteredHistory ? `Voturi pentru "${filterQuery}"` : "Istoric Voturi"}
          </h2>
          <span className="muted" style={{ fontSize: 12 }}>
            {isFilteredHistory ? `${mp.recent_votes?.length ?? 0} voturi filtrate` : `ultimele ${mp.recent_votes?.length ?? 0} voturi`}
          </span>
        </div>

        {mp.recent_votes?.length > 0 ? (
          mp.recent_votes.map((v, i) => <VoteRow key={i} vote={v} />)
        ) : (
          <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            {isFilteredHistory ? "Nu există voturi pentru aceste legi filtrate." : "Nu există voturi înregistrate."}
          </p>
        )}
      </div>
    </div>
  );
}
