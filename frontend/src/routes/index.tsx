import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { PaginatedBills } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BillCard } from "@/components/bill-card";
import { BillCardSkeleton } from "@/components/bill-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

function DashboardPage() {
  const [data, setData] = useState<PaginatedBills | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const limit = 9;

  const loadBills = async (pageNum = page) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.listBills(status, pageNum, limit);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills(page);
  }, [status, page]);

  const handleStatusChange = (newStatus: string | undefined) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page when changing filters
  };

  const bills = (data && Array.isArray(data.bills)) ? data.bills : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Civic Feed</h1>
            <p className="text-gray-600 mt-2 font-medium">Personalized legislative impact tracking.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={status === undefined ? "default" : "outline"}
              onClick={() => handleStatusChange(undefined)}
              className="px-6 font-bold"
            >
              All
            </Button>
            <Button
              variant={status === "Adoptată" ? "default" : "outline"}
              onClick={() => handleStatusChange("Adoptată")}
              className="px-6 font-bold"
            >
              Adopted
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => loadBills(page)} 
              disabled={isLoading}
              title="Refresh bills"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" height="20" 
                viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2" 
                strokeLinecap="round" strokeLinejoin="round"
                className={cn(isLoading && "animate-spin")}
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-6 font-medium">
            {error}
          </div>
        )}

        {/* Bills Grid */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <BillCardSkeleton key={i} />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-gray-400 text-lg font-bold uppercase tracking-widest">
                    No bills found in this category
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bills.map((bill) => (
                  <BillCard key={bill.idp} bill={bill} />
                ))}
              </div>
              
              {data && data.totalPages > 1 && (
                <div className="pt-8 flex justify-center">
                  <Pagination 
                    currentPage={page} 
                    totalPages={data.totalPages} 
                    onPageChange={setPage} 
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
