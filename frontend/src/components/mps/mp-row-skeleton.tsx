export function MPRowSkeleton() {
  return (
    <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ height: 16, width: 180, background: "var(--color-muted)", borderRadius: 4 }} />
            <div style={{ height: 18, width: 60, background: "var(--color-muted)", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ height: 14, width: 80, background: "var(--color-muted)", borderRadius: 4 }} />
            <div style={{ height: 14, width: 65, background: "var(--color-muted)", borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ height: 20, width: 32, background: "var(--color-muted)", borderRadius: 4 }} />
      </div>
      <div style={{ height: 6, background: "var(--color-muted)", borderRadius: 99, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 16 }}>
        {[50, 50, 60, 50].map((w, i) => <div key={i} style={{ height: 13, width: w, background: "var(--color-muted)", borderRadius: 4 }} />)}
      </div>
    </div>
  );
}
