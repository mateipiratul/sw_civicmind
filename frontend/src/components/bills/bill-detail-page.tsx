import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
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

export function BillDetailPage() {
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
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "32px", maxWidth: "400px", width: "100%", textAlign: "center", boxShadow: "var(--shadow-card)" }}>
          <div style={{ width: "64px", height: "64px", margin: "0 auto 24px", borderRadius: "50%", background: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <FileText size={28} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Legislație negăsită</h1>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "32px" }}>
            {billError instanceof Error ? billError.message : "Acest proiect legislativ nu a putut fi încărcat sau nu există."}
          </p>
          <Button onClick={() => navigate({ to: "/" })} style={{ width: "100%", background: "var(--primary)", color: "var(--primary-text)" }}>
            Înapoi la feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px", paddingBottom: "60px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <Breadcrumbs items={[{ label: "Feed", href: "/" }, { label: bill.bill_number }]} />
          <Link
            to="/"
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "8px", 
              padding: "8px 16px", 
              borderRadius: "999px", 
              background: "var(--surface)", 
              border: "1px solid var(--border)", 
              fontSize: "13.5px", 
              fontWeight: 700, 
              color: "var(--text)", 
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
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
