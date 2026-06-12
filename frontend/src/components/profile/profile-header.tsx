import { useAuth } from "@/lib/use-auth";
import { Link } from "@tanstack/react-router";

export function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.username.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
      <div style={{
        height: 56, width: 56, borderRadius: "var(--radius)", background: "var(--primary)", color: "var(--primary-text)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700,
        letterSpacing: "-0.02em", flexShrink: 0, overflow: "hidden", border: "1px solid var(--border)",
      }}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>{user.username}</h1>
          {user.role === "admin" && (
            <span style={{ padding: "2px 8px", background: "var(--color-muted)", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: 4, border: "1px solid var(--border)" }}>
              Admin
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>Gestionează setările și interesele contului CivicMind.</p>
        {user.role === "admin" && (
          <div style={{ marginTop: 4 }}>
            <Link
              to="/admin/stats"
              style={{ display: "inline-block", padding: "4px 12px", background: "var(--primary)", color: "var(--primary-text)", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius-sm)", textDecoration: "none" }}
            >
              Admin Panel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
