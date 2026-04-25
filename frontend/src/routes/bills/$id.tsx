import { useEffect, useState } from "react";
import { useParams, useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Bill } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";
import { Calendar, Clock, FileText, User, MessageSquare, ThumbsUp, ThumbsDown, Mail } from "lucide-react";

function BillDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isLoading) {
    return <BillDetailSkeleton />;
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full px-4">
          <Card className="border-none shadow-2xl rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="bg-red-50 p-4 rounded-full">
                <FileText className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Bill Not Found</h2>
              <p className="text-gray-500 font-medium">The legislative document you're looking for doesn't exist or has been moved.</p>
              <Button 
                onClick={() => navigate({ to: "/" })}
                className="mt-2 px-8 py-6 rounded-xl font-black uppercase tracking-widest"
              >
                Back to Feed
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 pb-20">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: "Civic Feed", href: "/" },
            { label: bill.bill_number }
          ]} 
        />

        {/* Main Bill Card */}
        <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
          <CardHeader className="pb-6 pt-8 px-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black px-3 py-1">
                    {bill.bill_number}
                  </Badge>
                  <Badge className="bg-gray-900 text-white font-black px-3 py-1">
                    {bill.status || "In Progress"}
                  </Badge>
                </div>
                <CardTitle className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-gray-900">
                  {ai?.title_short || bill.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1.5 rounded-lg text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                    <span>{bill.initiator_type || "Unknown Initiator"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1.5 rounded-lg text-gray-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span>Registered: {registeredDate?.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1.5 rounded-lg text-gray-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span>{bill.law_type || "Law"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-8 pb-8 space-y-10">
            {/* AI Synthesis Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">AI Synthesis</h3>
              </div>
              
              <div className="grid gap-4">
                {ai?.key_ideas && ai.key_ideas.length > 0 ? (
                  ai.key_ideas.map((idea, idx) => (
                    <div key={idx} className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex gap-4">
                      <span className="text-2xl font-black text-indigo-200">0{idx + 1}</span>
                      <p className="text-indigo-900 font-bold leading-relaxed">{idea}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-8 rounded-3xl border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 font-bold italic">AI Analysis is currently pending for this bill.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arguments Section */}
            {(ai?.pro_arguments?.length || ai?.con_arguments?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <ThumbsUp className="h-5 w-5" />
                    <h4 className="text-lg font-black uppercase tracking-widest">Pro Arguments</h4>
                  </div>
                  <div className="space-y-3">
                    {ai.pro_arguments.map((arg, idx) => (
                      <div key={idx} className="bg-green-50 p-4 rounded-xl border border-green-100 text-green-900 text-sm font-medium">
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <ThumbsDown className="h-5 w-5" />
                    <h4 className="text-lg font-black uppercase tracking-widest">Con Arguments</h4>
                  </div>
                  <div className="space-y-3">
                    {ai.con_arguments.map((arg, idx) => (
                      <div key={idx} className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-900 text-sm font-medium">
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Impact Badges */}
            {ai?.impact_categories && ai.impact_categories.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                 <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Impact Areas</h4>
                 <div className="flex flex-wrap gap-2">
                    {ai.impact_categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm font-black text-gray-700">
                        {cat}
                      </Badge>
                    ))}
                 </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4">
               <Button className="flex-1 py-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] gap-3">
                  <Mail className="h-6 w-6" />
                  Email Representative
               </Button>
               {bill.source_url && (
                 <Button variant="outline" asChild className="flex-1 py-8 rounded-2xl border-2 font-black text-lg gap-3">
                    <a href={bill.source_url} target="_blank" rel="noopener noreferrer">
                       <FileText className="h-6 w-6" />
                       View Original Text
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
