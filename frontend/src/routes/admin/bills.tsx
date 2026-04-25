import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { PaginatedBills } from "@/lib/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/bills")({
  component: AdminBillsPage,
});

function AdminBillsSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b">
          <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-64" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
          <td className="px-6 py-4 text-right"><Skeleton className="h-5 w-20 ml-auto" /></td>
          <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
          <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

function AdminBillsPage() {
  const [data, setData] = useState<PaginatedBills | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const loadBills = async (targetPage: number) => {
    try {
      setIsLoading(true);
      const res = await api.getAdminBills(targetPage);
      setData(res);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills(page);
  }, [page]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Legislative Inventory</h1>
          <p className="text-gray-500 font-medium">Overview of all bills indexed from official sources.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadBills(page)}
          className="rounded-xl font-bold border-gray-200"
        >
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 font-bold">
          {error}
        </div>
      )}

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-black tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">IDP</th>
                  <th className="px-6 py-5">Bill Number</th>
                  <th className="px-6 py-5">Title</th>
                  <th className="px-6 py-5">Initiator</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <AdminBillsSkeleton />
                ) : !data || data.bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  data.bills.map((bill) => (
                    <tr key={bill.idp} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">#{bill.idp}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{bill.bill_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 font-medium line-clamp-1">{bill.title}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {bill.initiator_type || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge 
                          variant={bill.status === "Adoptată" ? "default" : "secondary"}
                          className="capitalize font-bold px-3 py-1"
                        >
                          {bill.status || "Unknown"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="font-bold text-[#111] hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          onClick={() => navigate({ 
                            to: "/bills/$id",
                            params: { id: bill.idp.toString() }
                          })}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="pt-4">
          <Pagination 
            currentPage={page} 
            totalPages={data.totalPages} 
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
}
