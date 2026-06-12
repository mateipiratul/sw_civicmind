import { useState } from "react";
import { ChevronDown, MapPin, Check } from "lucide-react";

interface CountySectionProps {
  currentCounty: string;
  counties: string[];
  onChange: (county: string) => void;
}

export function CountySection({ currentCounty, counties, onChange }: CountySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={14} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Județ de reședință
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 14px", height: 44, borderRadius: "var(--radius)",
            border: isOpen ? "1px solid var(--primary)" : "1px solid var(--border)",
            background: "var(--bg)", cursor: "pointer", fontFamily: "inherit",
            transition: "border-color 0.15s",
            boxShadow: isOpen ? "0 0 0 3px rgba(17,17,17,0.06)" : "none",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: currentCounty ? "var(--text)" : "var(--text-placeholder)" }}>
            {currentCounty || "Selectează județul"}
          </span>
          <ChevronDown
            size={16}
            style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {isOpen && (
          <div style={{
            position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.12)", maxHeight: 300, overflowY: "auto", padding: 6,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {counties.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setIsOpen(false); }}
                  style={{
                    padding: "8px 10px", fontSize: 13, fontWeight: 500, borderRadius: 8,
                    border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 6,
                    background: currentCounty === c ? "var(--primary)" : "transparent",
                    color: currentCounty === c ? "var(--primary-text)" : "var(--text)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (currentCounty !== c) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { if (currentCounty !== c) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {currentCounty === c && <Check size={12} style={{ flexShrink: 0 }} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0 }}>
        Folosit pentru a prioritiza legile și reprezentanții locali în feed-ul tău.
      </p>
    </div>
  );
}
