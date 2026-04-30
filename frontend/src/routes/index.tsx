import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { PaginatedBills, Bill, Parliamentarian } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { BillCardSkeleton } from "@/components/bill-card-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Calendar, FileText, ChevronRight, RefreshCw } from "lucide-react";

const CATEGORIES = [
  { id: undefined, label: "Pentru Tine" },
  { id: "Fiscal", label: "Fiscal" },
  { id: "Sănătate", label: "Sănătate" },
  { id: "Educație", label: "Educație" },
  { id: "Muncă", label: "Muncă" },
  { id: "Mediu", label: "Mediu" },
  { id: "Justiție", label: "Justiție" },
];

const CAT_DOTS: Record<string, string> = {
  Fiscal: "#f97316",
  Sănătate: "#22c55e",
  Educație: "#3b82f6",
  Muncă: "#8b5cf6",
  Mediu: "#10b981",
  Justiție: "#ef4444",
};

function FeedBillCard({ bill }: { bill: Bill }) {
  const ai = bill.ai_analysis;
  const title = ai?.title_short || bill.title;
  const isAdopted = bill.status?.toLowerCase().includes("adoptat");

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {ai?.impact_categories?.slice(0, 1).map((cat) => (
          <span key={cat} style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: "#f5f5f5", color: "#555" }}>
            {cat}
          </span>
        ))}
        <span style={{
          fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4,
          background: isAdopted ? "#dcfce7" : "#f0f0f0",
          color: isAdopted ? "#16a34a" : "#666",
        }}>
          {bill.status || "În analiză"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{bill.bill_number}</span>
      </div>

      <div style={{ fontSize: 14.5, fontWeight: 600, color: "#111", lineHeight: 1.45 }}>{title}</div>

      {ai?.key_ideas && ai.key_ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            AI Rezumat
          </div>
          {ai.key_ideas.slice(0, 2).map((idea, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontSize: 12.5, color: "#555", lineHeight: 1.5 }}>
              <span style={{ color: "#bbb", flexShrink: 0 }}>•</span>
              <span>{idea}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
        {bill.registered_at && (
          <span style={{ fontSize: 11.5, color: "#aaa", display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} />
            {new Date(bill.registered_at).toLocaleDateString("ro-RO")}
          </span>
        )}
        {bill.law_type && (
          <span style={{ fontSize: 11.5, color: "#aaa", display: "flex", alignItems: "center", gap: 4 }}>
            <FileText size={12} />
            {bill.law_type}
          </span>
        )}
        <Link
          to="/bills/$id"
          params={{ id: String(bill.idp) }}
          style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 500, color: "#111", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
        >
          Citește detalii <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function MPSidebarCard({ mp }: { mp: Parliamentarian }) {
  const s = mp.impact_score;
  const total = s?.total_votes ?? 0;
  const forPct = total > 0 ? Math.round(((s?.for_count ?? 0) / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round(((s?.absent_count ?? 0) / total) * 100) : 0;

  return (
    <Link to="/mps/$slug" params={{ slug: mp.mp_slug }} style={{ textDecoration: "none" }}>
      <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.3 }}>{mp.mp_name}</div>
          {s?.score != null && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", flexShrink: 0 }}>{s.score.toFixed(0)}</div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: total > 0 ? 7 : 0 }}>
          {mp.party} · {mp.chamber === "deputies" ? "Deputat" : "Senator"}
        </div>
        {total > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#16a34a" }}>✓ {forPct}%</span>
            <span style={{ fontSize: 11, color: "#ccc" }}>Absent {absentPct}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<PaginatedBills | null>(null);
  const [localMPs, setLocalMPs] = useState<Parliamentarian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const limit = 10;

  const loadBills = useCallback(async (pageNum: number, cat: string | undefined) => {
    try {
      setIsLoading(true);
      setError(null);
      let res: PaginatedBills;
      if (isAuthenticated && cat === undefined) {
        try {
          res = await api.getPersonalizedFeed(pageNum, limit);
        } catch {
          res = await api.listBills(cat, pageNum, limit);
        }
      } else {
        res = await api.listBills(cat, pageNum, limit);
      }
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcarea legilor");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadBills(page, activeCategory);
  }, [activeCategory, page, loadBills]);

  useEffect(() => {
    if (user?.county) {
      api.listMPs({ county: user.county, limit: 5 }).then(res => setLocalMPs(res.parliamentarians.slice(0, 5))).catch(() => {});
    }
  }, [user?.county]);

  const handleCategoryChange = (cat: string | undefined) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const bills = data?.bills && Array.isArray(data.bills) ? data.bills : [];

  return (
    <>
    <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
      {/* Left sidebar */}
      <aside style={{ width: 200, flexShrink: 0, position: "sticky", top: 52, alignSelf: "flex-start", height: "calc(100vh - 52px)", overflowY: "auto", borderRight: "1px solid #e8e8e8", background: "rgba(255,255,255,0.75)", padding: "20px 0" }}>
        <div style={{ padding: "0 16px", marginBottom: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Categorii
          </span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const dot = cat.id ? CAT_DOTS[cat.id] : "#111";
            return (
              <button
                key={String(cat.id)}
                onClick={() => handleCategoryChange(cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 16px",
                  background: isActive ? "#f5f5f5" : "none", border: "none", cursor: "pointer",
                  textAlign: "left", width: "100%", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: isActive ? "#111" : "#555", fontWeight: isActive ? 600 : 400 }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 3 }}>
                {activeCategory ? activeCategory : isAuthenticated ? "Feed Personalizat" : "Legislativ Actual"}
              </h1>
              <p style={{ fontSize: 13, color: "#888" }}>
                {isAuthenticated && !activeCategory
                  ? "Legi relevante pentru interesele și județul tău."
                  : "Ultimele actualizări legislative."}
              </p>
            </div>
            <button
              onClick={() => loadBills(page, activeCategory)}
              disabled={isLoading}
              style={{ background: "none", border: "none", cursor: isLoading ? "default" : "pointer", color: "#aaa", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            >
              <RefreshCw size={14} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isLoading
              ? [...Array(4)].map((_, i) => <BillCardSkeleton key={i} />)
              : bills.length === 0
              ? <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 13 }}>Nu există proiecte în această categorie.</div>
              : bills.map((bill) => <FeedBillCard key={bill.idp} bill={bill} />)
            }
          </div>

          {data && data.totalPages > 1 && (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
              <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </main>

      {/* Right panel */}
      <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 52, alignSelf: "flex-start", height: "calc(100vh - 52px)", overflowY: "auto", borderLeft: "1px solid #e8e8e8", background: "rgba(255,255,255,0.75)", padding: "20px 16px", display: "flex", flexDirection: "column" }}>
        {localMPs.length > 0 ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Parlamentarii Tăi
              </span>
              {user?.county && (
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{user.county}</div>
              )}
            </div>
            {localMPs.map((mp, i) => (
              <MPSidebarCard key={mp.mp_slug} mp={mp} />
            ))}
            <Link
              to="/mps"
              style={{ fontSize: 12, color: "#888", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}
            >
              Toți parlamentarii <ChevronRight size={12} />
            </Link>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                În Tendințe
              </span>
            </div>
            {bills.slice(0, 4).map((bill, i) => (
              <Link key={bill.idp} to="/bills/$id" params={{ id: String(bill.idp) }} style={{ textDecoration: "none" }}>
                <div style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid #f0f0f0" : "none", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>Acum {i + 1} zi{i === 0 ? "" : "le"}</div>
                  <div style={{ fontSize: 12.5, color: "#333", lineHeight: 1.4, fontWeight: 500 }}>
                    {(bill.ai_analysis?.title_short || bill.title).substring(0, 60)}
                    {(bill.ai_analysis?.title_short || bill.title).length > 60 ? "…" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}

        {!isAuthenticated && (
          <div style={{
            position: "sticky", bottom: 16, marginTop: "auto",
            background: "white", borderRadius: 10,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
            padding: "12px 14px",
          }}>
            <span style={{ fontSize: 12, color: "#666", lineHeight: 1.6, display: "block" }}>
              <Link to="/auth/login" style={{ color: "#111", fontWeight: 700 }}>Autentifică-te</Link>
              {" "}ca să urmărești ce contează pentru tine și să rămâi la curent cu schimbările legislative.
            </span>
          </div>
        )}
      </aside>
    </div>
    </>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
