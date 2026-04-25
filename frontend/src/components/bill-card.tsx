import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Bill } from "@/lib/api";
import { Calendar, FileText, ChevronRight, Scale } from "lucide-react";

interface BillCardProps {
  bill: Bill;
}

export function BillCard({ bill }: BillCardProps) {
  const analysis = bill.ai_analysis;
  const title = analysis?.title_short || bill.title;
  
  return (
    <Card className="group flex flex-col h-full border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex justify-between items-start gap-4">
          <Badge variant="outline" className="font-black tracking-widest uppercase text-[10px] py-1 border-gray-200">
            {bill.bill_number}
          </Badge>
          <Badge 
            className={cn(
              "font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider",
              bill.status?.toLowerCase().includes("adoptat") 
                ? "bg-green-100 text-green-700 hover:bg-green-100" 
                : "bg-blue-100 text-blue-700 hover:bg-blue-100"
            )}
          >
            {bill.status || "In Analiza"}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold leading-tight group-hover:text-indigo-600 transition-colors line-clamp-3">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          {analysis?.impact_categories?.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-bold text-[10px] uppercase">
              {cat}
            </Badge>
          ))}
          {!analysis?.impact_categories?.length && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-400 border-none font-bold text-[10px] uppercase">
              Pending Analysis
            </Badge>
          )}
        </div>
        
        <div className="space-y-2 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-gray-400" />
            <span>{bill.registered_at ? new Date(bill.registered_at).toLocaleDateString() : 'Unknown date'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-gray-400" />
            <span className="truncate">{bill.law_type || 'Legislative Project'}</span>
          </div>
          {analysis?.controversy_score !== undefined && analysis?.controversy_score !== null && (
             <div className="flex items-center gap-2">
               <Scale className="size-4 text-gray-400" />
               <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-amber-500" 
                   style={{ width: `${(analysis.controversy_score || 0) * 10}%` }} 
                 />
               </div>
               <span className="text-[10px] font-black text-amber-600 uppercase">Impact</span>
             </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-6">
        <Link 
          to="/bills/$id" 
          params={{ id: String(bill.idp) }}
          className="w-full"
        >
          <Button className="w-full justify-between py-6 rounded-xl font-black text-sm bg-gray-900 hover:bg-indigo-600 active:scale-[0.98] transition-all group/btn">
            VIEW DETAILS
            <ChevronRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
