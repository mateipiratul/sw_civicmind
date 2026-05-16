import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, FileText } from "lucide-react";

// Modular Components
import { BillDetailsHeader } from "@/components/bill-detail/bill-details-header";
import { BillSynthesis } from "@/components/bill-detail/bill-synthesis";
import { BillArguments } from "@/components/bill-detail/bill-arguments";
import { BillImpact } from "@/components/bill-detail/bill-impact";
import { BillVotes } from "@/components/bill-detail/bill-votes";
import { BillDocuments } from "@/components/bill-detail/bill-documents";
import { BillChat } from "@/components/bill-detail/bill-chat";

function BillDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f8f7] p-10 lg:p-14">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-[350px] w-full rounded-xl" />
            <Skeleton className="h-[250px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BillDetailPage() {
  const { id } = useParams({ from: "/bills/$id" });
  const navigate = useNavigate();
  const { isLoading: isAuthLoading } = useAuth();
  const billId = Number.parseInt(id, 10);

  const {
    data: bill,
    isLoading: isBillLoading,
    error: billError,
  } = useQuery({
    queryKey: ["bill", billId],
    queryFn: () => api.getBill(billId),
    enabled: !isNaN(billId),
  });

  const {
    data: votes,
  } = useQuery({
    queryKey: ["bill-votes", billId],
    queryFn: () => api.getBillVotes(billId),
    enabled: !!bill,
  });

  if (isAuthLoading || isBillLoading) {
    return <BillDetailSkeleton />;
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-[#f8f8f7] flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <FileText size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Legislație negăsită</h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            {billError instanceof Error ? billError.message : "Acest proiect legislativ nu a putut fi încărcat sau nu există."}
          </p>
          <Button onClick={() => navigate({ to: "/" })} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
            Înapoi la feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f7] p-6 lg:p-10">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumbs items={[{ label: "Feed", href: "/" }, { label: bill.bill_number }]} />
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-[13.5px] font-bold text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ChevronLeft size={16} />
            Înapoi
          </Link>
        </div>

        <BillDetailsHeader bill={bill} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
          <div className="flex flex-col gap-6">
            <BillSynthesis bill={bill} />
            <BillArguments bill={bill} />
            <BillImpact bill={bill} />
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <BillVotes votes={votes ?? null} />
            <BillDocuments bill={bill} />
          </aside>
        </div>

        <BillChat bill={bill} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bills/$id")({
  component: BillDetailPage,
});
