import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Bill } from "@/lib/api";
import { Calendar, FileText, ChevronRight, Scale } from "lucide-react";

interface BillCardProps {
  bill: Bill;
}

export function BillCard({ bill }: BillCardProps) {
  const analysis = bill.ai_analysis;
  const title = analysis?.title_short || bill.title;

  return (
    <Card className="group flex flex-col h-full border border-[#e2e2e2] shadow-none hover:shadow-sm transition-shadow duration-200 rounded-xl overflow-hidden bg-white">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex justify-between items-start gap-3">
          <Badge variant="outline" className="font-medium text-[10px] uppercase tracking-wider text-gray-500 border-gray-200">
            {bill.bill_number}
          </Badge>
          <Badge
            className={cn(
              "font-medium text-[10px] uppercase tracking-wider border-0",
              bill.status?.toLowerCase().includes("adoptat")
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {bill.status || "În analiză"}
          </Badge>
        </div>
        <CardTitle className="text-[15px] font-semibold leading-snug text-[#111] group-hover:text-gray-600 transition-colors line-clamp-3">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {analysis?.impact_categories?.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary" className="bg-gray-100 text-gray-600 border-0 text-[10px] uppercase font-medium">
              {cat}
            </Badge>
          ))}
          {!analysis?.impact_categories?.length && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-400 border-0 text-[10px] uppercase font-medium">
              Pending
            </Badge>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-gray-400" />
            <span>{bill.registered_at ? new Date(bill.registered_at).toLocaleDateString("ro-RO") : "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-gray-400" />
            <span className="truncate">{bill.law_type || "Proiect de lege"}</span>
          </div>
          {analysis?.controversy_score !== undefined && analysis?.controversy_score !== null && (
            <div className="flex items-center gap-2">
              <Scale className="size-3.5 text-gray-400" />
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${(analysis.controversy_score || 0) * 10}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-400 uppercase">Impact</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 px-4">
        <Link
          to="/bills/$id"
          params={{ id: String(bill.idp) }}
          className="w-full"
        >
          <Button className="w-full justify-between rounded-lg font-medium text-sm bg-[#111] hover:bg-gray-800 active:scale-[0.99] transition-all group/btn">
            Vezi detalii
            <ChevronRight className="size-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

