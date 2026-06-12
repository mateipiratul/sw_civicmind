import { MetaCard } from "@/components/ui/meta-card";
import { formatDate, extractBillTitleAndBody, cleanText } from "@/lib/utils";
import type { Bill } from "@/lib/api";
import { Calendar, FileText, Scale, User } from "lucide-react";

interface BillDetailsHeaderProps {
  bill: Bill;
}

export function BillDetailsHeader({ bill }: BillDetailsHeaderProps) {
  const ai = bill.ai_analysis;
  const { title, body } = extractBillTitleAndBody(ai?.title_short || bill.title);
  const registeredDate = formatDate(bill.registered_at);
  const adoptedDate = bill.adopted_at ? formatDate(bill.adopted_at) : "În analiză";
  const isAdopted = bill.status?.toLowerCase().includes("adoptat");

  return (
    <section 
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <span style={{ 
          fontSize: "11px", 
          fontWeight: 700, 
          padding: "4px 10px", 
          borderRadius: "6px", 
          background: "var(--color-muted)", 
          color: "var(--text-muted)",
          border: "1px solid var(--border)"
        }}>
          {bill.bill_number}
        </span>
        {(!bill.status || bill.status.toLowerCase() === "la_comisii" || bill.status.toLowerCase() === "la comisii") ? null : (
          <span style={{
            fontSize: "11px", 
            fontWeight: 700, 
            padding: "4px 10px", 
            borderRadius: "6px",
            background: isAdopted ? "var(--color-success)" : "var(--color-muted)",
            color: isAdopted ? "var(--color-primary-foreground)" : "var(--text-muted)",
          }}>
            {bill.status}
          </span>
        )}
        {bill.procedure && (
          <span style={{ 
            fontSize: "11px", 
            fontWeight: 700, 
            padding: "4px 10px", 
            borderRadius: "6px", 
            background: "var(--color-muted)", 
            color: "var(--text-muted)" 
          }}>
            {bill.procedure}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <h1 style={{ 
            fontSize: "clamp(24px, 5vw, 36px)", 
            fontWeight: 800, 
            lineHeight: 1.1, 
            color: "var(--text)", 
            letterSpacing: "-0.02em" 
          }}>
            {title}
          </h1>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--text-muted)", maxWidth: "640px", whiteSpace: "pre-wrap" }}>
            {ai?.key_ideas?.[0]
              ? cleanText(ai.key_ideas[0])
              : (body ? (body.length > 500 ? body.substring(0, 500) + "..." : body) : "Această pagină reunește statusul oficial, rezumatul AI, documentele sursă și indicatorii de impact pentru acest proiect legislativ.")}
          </p>
        </div>

        <div style={{ 
          borderRadius: "12px", 
          border: "1px solid var(--border)", 
          background: "var(--bg)", 
          padding: "16px",
          opacity: 0.8
        }}>
          <div style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "var(--text-muted)", 
            textTransform: "uppercase", 
            letterSpacing: "0.08em", 
            marginBottom: "8px" 
          }}>
            Notă transparență
          </div>
          <p style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--text-muted)" }}>
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
    </section>
  );
}
