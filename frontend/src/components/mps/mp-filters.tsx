import { X } from "lucide-react";

interface MPFiltersProps {
  party: string;
  setParty: (party: string) => void;
  county: string;
  setCounty: (county: string) => void;
  partyOptions: string[];
  countyOptions: string[];
  onReset: () => void;
}

const selectStyle: React.CSSProperties = {
  padding: "8px 32px 8px 12px", fontSize: 13.5,
  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  background: "var(--surface)", color: "var(--text)", outline: "none", cursor: "pointer",
  fontFamily: "inherit", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  transition: "border-color 0.15s",
  height: 38,
};

export function MPFilters({ 
  party, setParty, county, setCounty, 
  partyOptions, countyOptions, onReset 
}: MPFiltersProps) {
  const hasFilters = party || county;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select
        value={party}
        onChange={e => setParty(e.target.value)}
        style={selectStyle}
        onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--primary)"; }}
        onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--border)"; }}
      >
        <option value="">Toate partidele</option>
        {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {countyOptions.length > 0 && (
        <select
          value={county}
          onChange={e => setCounty(e.target.value)}
          style={selectStyle}
          onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--border)"; }}
        >
          <option value="">Toate județele</option>
          {countyOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={onReset}
          style={{
            display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
            cursor: "pointer", fontFamily: "inherit", padding: "6px 8px", fontSize: 13,
            color: "var(--text-muted)", borderRadius: "var(--radius-sm)", transition: "color 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          <X size={13} /> Resetează
        </button>
      )}
    </div>
  );
}
