import { ArrowUpRight, FileText } from "lucide-react";
import type { Bill } from "@/lib/api";
import { useMemo } from "react";

interface SourceDocument {
  label: string;
  url: string;
}

interface BillDocumentsProps {
  bill: Bill;
}

export function BillDocuments({ bill }: BillDocumentsProps) {
  const sourceDocuments = useMemo(() => {
    return [
      bill.doc_expunere_url ? { label: "Expunere de motive", url: bill.doc_expunere_url } : null,
      bill.doc_forma_url ? { label: "Forma propusa", url: bill.doc_forma_url } : null,
      bill.doc_aviz_ces_url ? { label: "Aviz CES", url: bill.doc_aviz_ces_url } : null,
      bill.doc_aviz_cl_url ? { label: "Aviz Consiliul Legislativ", url: bill.doc_aviz_cl_url } : null,
      bill.doc_adoptata_url ? { label: "Forma adoptata", url: bill.doc_adoptata_url } : null,
      bill.source_url ? { label: "Pagina oficiala", url: bill.source_url } : null,
    ].filter((doc): doc is SourceDocument => Boolean(doc));
  }, [bill]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 mb-5">
        Surse și referințe
      </div>
      <div className="flex flex-col gap-2.5">
        {sourceDocuments.length ? (
          sourceDocuments.map((document) => (
            <a
              key={`${document.label}-${document.url}`}
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900 flex-shrink-0 group-hover:bg-white transition-colors">
                  <FileText size={16} />
                </div>
                <span className="text-[13.5px] font-semibold text-gray-700">{document.label}</span>
              </div>
              <ArrowUpRight size={16} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
            </a>
          ))
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm leading-relaxed text-gray-500 text-center italic">
            Nu sunt atașate documente oficiale.
          </div>
        )}
      </div>
    </section>
  );
}
