import { CATEGORIES, CAT_DOTS } from "@/lib/constants";

interface CategoryNavProps {
  activeCategory: string | undefined;
  onCategoryChange: (cat: string | undefined) => void;
}

export function CategoryNav({ activeCategory, onCategoryChange }: CategoryNavProps) {
  return (
    <aside style={{ 
      width: 200, flexShrink: 0, position: "sticky", top: 52, alignSelf: "flex-start", 
      height: "calc(100vh - 52px)", overflowY: "auto", borderRight: "1px solid #e8e8e8", 
      background: "rgba(255,255,255,0.75)", padding: "20px 0" 
    }}>
      <div style={{ padding: "0 16px", marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Categorii
        </span>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const dot = cat.id ? CAT_DOTS[cat.id] : "#111";
          return (
            <button
              key={String(cat.id)}
              onClick={() => onCategoryChange(cat.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "7px 16px",
                background: isActive ? "#f5f5f5" : "none", border: "none", cursor: "pointer",
                textAlign: "left", width: "100%", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: isActive ? "#111" : "#555", fontWeight: isActive ? 600 : 400 }}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
