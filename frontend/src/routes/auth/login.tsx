import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsLoading(true);
      setError(null);
      const user = await api.login(username, password);
      login(user);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autentificarea a esuat");
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 24,
              height: 24,
              background: "var(--primary)",
              borderRadius: 6,
              display: "block",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
            CivicMind
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>
            Bine ai venit
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Intra in cont pentru a vedea feed-ul si profilul tau civic.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              Nume utilizator
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
              autoComplete="username"
              style={{
                padding: "9px 12px",
                fontSize: 13.5,
                border: "1px solid var(--border-input)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "var(--font)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              Parola
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              style={{
                padding: "9px 12px",
                fontSize: 13.5,
                border: "1px solid var(--border-input)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "var(--font)",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 12.5,
                color: "#dc2626",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: "var(--radius-sm, 6px)",
              border: "none",
              background: "var(--primary)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--primary-text)",
              cursor: isLoading ? "default" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "opacity 0.12s",
            }}
          >
            {isLoading ? "Se autentifica..." : "Autentifica-te"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 1, flex: 1, background: "#ececec" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>sau</span>
          <div style={{ height: 1, flex: 1, background: "#ececec" }} />
        </div>

        <button
          type="button"
          disabled
          title="Google auth is being wired to the backend."
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "11px 16px",
            borderRadius: "var(--radius-sm, 6px)",
            border: "1px solid var(--border-input)",
            background: "#fafafa",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-muted)",
            cursor: "not-allowed",
          }}
        >
          <GoogleIcon />
          Google auth in curs
        </button>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Continuand, esti de acord cu{" "}
          <a href="#" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 2 }}>
            Termenii de utilizare
          </a>{" "}
          si{" "}
          <a href="#" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 2 }}>
            Politica de confidentialitate
          </a>.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});
