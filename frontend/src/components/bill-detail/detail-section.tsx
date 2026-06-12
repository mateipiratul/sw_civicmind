import { type ReactNode } from "react";

interface DetailSectionProps {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function DetailSection({ eyebrow, title, icon, children }: DetailSectionProps) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {eyebrow && (
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 700, 
              color: "var(--text-muted)", 
              textTransform: "uppercase", 
              letterSpacing: "0.05em" 
            }}>
              {eyebrow}
            </div>
          )}
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{title}</h2>
        </div>
        {icon && (
          <div style={{ 
            width: "32px", 
            height: "32px", 
            borderRadius: "50%", 
            background: "var(--color-muted)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "var(--text)",
            flexShrink: 0
          }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}
