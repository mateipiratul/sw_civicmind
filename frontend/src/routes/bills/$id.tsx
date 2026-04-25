import { useEffect, useState } from "react";
import { useParams, useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Bill } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Calendar, FileText, User, MessageSquare, ThumbsUp, ThumbsDown, Mail } from "lucide-react";

function BillDetailSkeleton() {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Card className="border border-[#e2e2e2] shadow-none rounded-xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-36 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BillDetailPage() {
  const { id } = useParams({ from: "/bills/$id" });
  const navigate = useNavigate();
  const { isLoading: isAuthLoading } = useAuth();
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const billId = parseInt(id, 10);

  const loadBill = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await api.getBill(billId);
      setBill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bill details");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBill();
  }, [billId]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-[#111]" />
      </div>
    );
  }

  if (isLoading) {
    return <BillDetailSkeleton />;
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full px-4">
          <Card className="border border-[#e2e2e2] shadow-none rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="bg-gray-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-[#111]">Proiect negăsit</h2>
              <p className="text-gray-500 text-sm">Documentul legislativ nu există sau a fost mutat.</p>
              <Button onClick={() => navigate({ to: "/" })} className="mt-1 bg-[#111] hover:bg-gray-800">
                Înapoi la Feed
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const ai = bill.ai_analysis;
  const registeredDate = bill.registered_at ? new Date(bill.registered_at) : null;

  return (
    <div className="py-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 space-y-5">
        <Breadcrumbs
          items={[
            { label: "Feed", href: "/" },
            { label: bill.bill_number }
          ]}
        />

        {/* Main Bill Card */}
        <Card className="border border-[#e2e2e2] shadow-none rounded-xl bg-white">
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-gray-600 border-gray-200 font-medium text-xs">
                  {bill.bill_number}
                </Badge>
                <Badge className="bg-[#111] text-white font-medium text-xs border-0">
                  {bill.status || "În progres"}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-semibold leading-snug text-[#111]">
                {ai?.title_short || bill.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span>{bill.initiator_type || "Inițiator necunoscut"}</span>
                </div>
                {registeredDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>Înregistrat: {registeredDate.toLocaleDateString("ro-RO")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <span>{bill.law_type || "Lege"}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-8">
            {/* AI Synthesis */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#111] p-1.5 rounded-lg text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-[#111]">Analiză AI</h3>
              </div>

              <div className="space-y-2">
                {ai?.key_ideas && ai.key_ideas.length > 0 ? (
                  ai.key_ideas.map((idea, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-[#e2e2e2] flex gap-3">
                      <span className="text-lg font-semibold text-gray-300 leading-none mt-0.5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm text-[#111] leading-relaxed">{idea}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 text-sm">Analiza AI este în curs de procesare.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arguments */}
            {(ai?.pro_arguments?.length || ai?.con_arguments?.length) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <ThumbsUp className="h-4 w-4" />
                    <h4 className="text-sm font-semibold uppercase tracking-wide">Argumente Pro</h4>
                  </div>
                  <div className="space-y-2">
                    {ai!.pro_arguments.map((arg, idx) => (
                      <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-100 text-green-900 text-sm">
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-500">
                    <ThumbsDown className="h-4 w-4" />
                    <h4 className="text-sm font-semibold uppercase tracking-wide">Argumente Contra</h4>
                  </div>
                  <div className="space-y-2">
                    {ai!.con_arguments.map((arg, idx) => (
                      <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-900 text-sm">
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Impact Badges */}
            {ai?.impact_categories && ai.impact_categories.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#e2e2e2]">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Arii de Impact</h4>
                <div className="flex flex-wrap gap-2">
                  {ai.impact_categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="bg-gray-100 text-gray-700 border-0 font-medium">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#e2e2e2] flex flex-col md:flex-row gap-3">
              <Button className="flex-1 bg-[#111] hover:bg-gray-800 text-white font-medium gap-2">
                <Mail className="h-4 w-4" />
                Contactează reprezentantul
              </Button>
              {bill.source_url && (
                <Button variant="outline" asChild className="flex-1 border-[#e2e2e2] font-medium gap-2">
                  <a href={bill.source_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" />
                    Text original
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bills/$id")({
  component: BillDetailPage,
});
