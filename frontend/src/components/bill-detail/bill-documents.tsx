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
    <section 
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ 
        fontSize: "10.5px", 
        fontWeight: 700, 
        color: "var(--text-muted)", 
        textTransform: "uppercase", 
        letterSpacing: "0.05em",
        marginBottom: "4px"
      }}>
        Surse și referințe
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sourceDocuments.length ? (
          sourceDocuments.map((document) => (
            <a
              key={`${document.label}-${document.url}`}
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--text)";
                e.currentTarget.style.background = "var(--bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "8px", 
                  background: "var(--color-muted)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "var(--text)",
                  flexShrink: 0
                }}>
                  <FileText size={16} />
                </div>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{document.label}</span>
              </div>
              <ArrowUpRight size={16} style={{ color: "var(--text-muted)" }} />
            </a>
          ))
        ) : (
          <div style={{ 
            padding: "16px", 
            borderRadius: "10px", 
            border: "1px dashed var(--border)", 
            background: "var(--bg)", 
            fontSize: "13px", 
            color: "var(--text-muted)", 
            textAlign: "center", 
            fontStyle: "italic" 
          }}>
            Nu sunt atașate documente oficiale.
          </div>
        )}
      </div>
    </section>
  );
}
