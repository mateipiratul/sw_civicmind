import { useState } from "react";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    console.log("Submitting register form...");
    if (password !== confirmPassword) {
      setError("Parolele nu coincid");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Calling API...");
      const user = await api.register(username, email, password);
      console.log("API Success, logging in...");
      login(user);
      console.log("Login success, navigating...");
      navigate({ to: "/" });
    } catch (err) {
      console.error("Register error:", err);
      setError(err instanceof Error ? err.message : "Înregistrarea a eșuat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          width: "100%",
          maxWidth: 400,
          padding: "40px 36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/favicon.png" alt="CivicMind" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
            CivicMind
          </span>
        </div>

        {/* Heading */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>
            Creează cont
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Transparență legislativă pentru fiecare cetățean.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { 
            console.log("Form onSubmit triggered");
            e.preventDefault(); 
            handleRegister(); 
          }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label>Nume utilizator</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Parolă</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Confirmă parola</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12.5, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "11px 16px",
              borderRadius: "var(--radius-sm, 6px)",
              background: "var(--primary)",
              color: "var(--primary-text)",
              fontSize: 14,
              fontWeight: 500,
              cursor: isLoading ? "default" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "opacity 0.12s",
              border: "none",
              fontFamily: "var(--font)",
            }}
          >
            {isLoading ? "Se creează contul..." : "Creează cont"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          Ai deja cont?{" "}
          <Link
            to="/auth/login"
            style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "9px 12px",
  fontSize: 13.5,
  border: "1px solid var(--border-input)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  fontFamily: "var(--font)",
};

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});
