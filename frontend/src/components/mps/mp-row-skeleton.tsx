export function MPRowSkeleton() {
  return (
    <div style={{ width: "100%", background: "white", border: "1px solid #e8e8e8", borderRadius: 10, padding: "18px 22px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ height: 16, width: 180, background: "#f0f0f0", borderRadius: 4 }} />
            <div style={{ height: 18, width: 60, background: "#f5f5f5", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ height: 14, width: 80, background: "#f5f5f5", borderRadius: 4 }} />
            <div style={{ height: 14, width: 65, background: "#f5f5f5", borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ height: 20, width: 32, background: "#f0f0f0", borderRadius: 4 }} />
      </div>
      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 99, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 16 }}>
        {[50, 50, 60, 50].map((w, i) => <div key={i} style={{ height: 13, width: w, background: "#f5f5f5", borderRadius: 4 }} />)}
      </div>
    </div>
  );
}
