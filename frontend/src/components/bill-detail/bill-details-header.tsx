import { Badge } from "@/components/ui/badge";
import { MetaCard } from "@/components/ui/meta-card";
import { formatDate, cn } from "@/lib/utils";
import type { Bill } from "@/lib/api";
import { Calendar, FileText, Scale, User } from "lucide-react";

interface BillDetailsHeaderProps {
  bill: Bill;
}

export function BillDetailsHeader({ bill }: BillDetailsHeaderProps) {
  const ai = bill.ai_analysis;
  const title = ai?.title_short || bill.title;
  const registeredDate = formatDate(bill.registered_at);
  const adoptedDate = bill.adopted_at ? formatDate(bill.adopted_at) : "În analiză";

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2.5">
          <Badge variant="outline" className="bg-white border-gray-200 text-gray-600 px-2.5 py-1 text-[11px] font-medium">
            {bill.bill_number}
          </Badge>
          <Badge
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium border-0",
              bill.status?.toLowerCase().includes("adoptat")
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {bill.status || "În analiză"}
          </Badge>
          {bill.procedure && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-500 px-2.5 py-1 text-[11px] font-medium">
              {bill.procedure}
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
          <div className="flex flex-col gap-3.5">
            <h1 className="text-3xl lg:text-4xl font-bold leading-[1.1] text-gray-900 tracking-tight">
              {title}
            </h1>
            <p className="text-base leading-relaxed text-gray-600 max-w-2xl">
              {ai?.key_ideas?.[0]
                ? ai.key_ideas[0]
                : "Această pagină reunește statusul oficial, rezumatul AI, documentele sursă și indicatorii de impact pentru acest proiect legislativ."}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 mb-2">
              Notă transparență
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Rezumatul este generat automat pe baza documentelor oficiale. Consultă sursele de mai jos pentru verificarea detaliilor.
            </p>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetaCard
            icon={<User size={18} />}
            label="Inițiator"
            value={bill.initiator_name || bill.initiator_type || "Necunoscut"}
          />
          <MetaCard
            icon={<Calendar size={18} />}
            label="Înregistrat"
            value={registeredDate}
          />
          <MetaCard
            icon={<FileText size={18} />}
            label="Tip Lege"
            value={bill.law_type || "Proiect de lege"}
          />
          <MetaCard
            icon={<Scale size={18} />}
            label="Adoptat"
            value={adoptedDate}
          />
        </div>
      </div>
    </section>
  );
}
