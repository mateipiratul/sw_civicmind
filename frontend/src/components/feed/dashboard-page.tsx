import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { BillCardSkeleton } from "@/components/bill-card-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { RefreshCw } from "lucide-react";
import { FeedBillCard } from "./feed-bill-card";
import { RightSidebar } from "./right-sidebar";

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Bills Query
  const billsQuery = useQuery({
    queryKey: ["bills-feed", page, activeCategory, isAuthenticated],
    queryFn: async () => {
      if (isAuthenticated && activeCategory === undefined) {
        try {
          return await api.getPersonalizedFeed(page, limit);
        } catch {
          // Fallback to regular list if personalized feed fails
          return await api.listBills(activeCategory, page, limit);
        }
      }
      return await api.listBills(activeCategory, page, limit);
    },
  });

  // Local MPs Query
  const localMPsQuery = useQuery({
    queryKey: ["local-mps", user?.county],
    queryFn: () => api.listMPs({ county: user?.county, limit: 5 }),
    enabled: !!user?.county,
  });

  const handleCategoryChange = (cat: string | undefined) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const data = billsQuery.data;
  const bills = data?.bills && Array.isArray(data.bills) ? data.bills : [];
  const localMPs = localMPsQuery.data?.parliamentarians.slice(0, 5) || [];
  const isLoading = billsQuery.isLoading;
  const error = billsQuery.error instanceof Error ? billsQuery.error.message : null;

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
      {/* Main content */}
      <main style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", marginBottom: 4, letterSpacing: "-0.02em" }}>
                {activeCategory ? activeCategory : isAuthenticated ? "Feed Personalizat" : "Legislativ Actual"}
              </h1>
              <p className="muted" style={{ fontSize: 13.5, color: "#666" }}>
                {isAuthenticated && !activeCategory
                  ? "Legi relevante pentru interesele și județul tău."
                  : "Ultimele actualizări legislative."}
              </p>
            </div>
            <button
              onClick={() => billsQuery.refetch()}
              disabled={isLoading}
              style={{ background: "none", border: "none", cursor: isLoading ? "default" : "pointer", color: "#aaa", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, marginTop: 4 }}
            >
              <RefreshCw size={16} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>

          {error && (
            <div className="error-box" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isLoading
              ? [...Array(4)].map((_, i) => <BillCardSkeleton key={i} />)
              : bills.length === 0
              ? <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 13 }}>Nu există proiecte în această categorie.</div>
              : bills.map((bill) => <FeedBillCard key={bill.idp} bill={bill} userInterests={user?.interests || []} />)
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
      <RightSidebar 
        isAuthenticated={isAuthenticated}
        user={user}
        localMPs={localMPs}
        trendingBills={bills}
      />
    </div>
  );
}
