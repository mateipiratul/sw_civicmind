import { DetailSection } from "./detail-section";
import { MessageSquareText, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Bill } from "@/lib/api";

interface BillArgumentsProps {
  bill: Bill;
}

export function BillArguments({ bill }: BillArgumentsProps) {
  const ai = bill.ai_analysis;

  return (
    <DetailSection
      eyebrow="Analiză dezbatere"
      title="Argumente Pro și Contra"
      icon={<MessageSquareText size={20} />}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-green-50/50 p-5">
          <div className="flex items-center gap-2.5 text-green-700 font-bold text-xs tracking-wider uppercase mb-3.5">
            <ShieldCheck size={18} />
            Argumente PRO
          </div>
          {ai?.pro_arguments?.length ? (
            <div className="flex flex-col gap-3">
              {ai.pro_arguments.map((argument, index) => (
                <p key={`${index}-${argument}`} className="text-[14.5px] leading-relaxed text-green-900/80">
                  {argument}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-green-700/60 italic">
              Nu au fost extrase argumente de susținere.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-center gap-2.5 text-red-700 font-bold text-xs tracking-wider uppercase mb-3.5">
            <ShieldAlert size={18} />
            Argumente CONTRA
          </div>
          {ai?.con_arguments?.length ? (
            <div className="flex flex-col gap-3">
              {ai.con_arguments.map((argument, index) => (
                <p key={`${index}-${argument}`} className="text-[14.5px] leading-relaxed text-red-900/80">
                  {argument}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-red-700/60 italic">
              Nu au fost extrase critici pentru acest proiect.
            </p>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
