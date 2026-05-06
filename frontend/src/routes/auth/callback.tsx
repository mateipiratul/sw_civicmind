import { useEffect, useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type CallbackSearch = {
  code?: string;
  error?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => {
    return {
      code: search.code as string | undefined,
      error: search.error as string | undefined,
    };
  },
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { code, error: searchError } = Route.useSearch();
  const [error, setError] = useState<string | null>(searchError || null);
  const processed = useRef(false);

  useEffect(() => {
    // Avoid double-processing in StrictMode
    if (processed.current) return;

    if (searchError) {
      setError(`Eroare de la Google: ${searchError}`);
      return;
    }

    if (!code) {
      setError("Nu s-a găsit niciun cod de autentificare.");
      return;
    }

    const handleCallback = async () => {
      processed.current = true;
      try {
        console.log("[AuthCallback] Exchanging code for token...");
        const user = await api.googleLoginWithCode(code);
        login(user);
        console.log("[AuthCallback] Login successful, redirecting...");
        navigate({ to: "/" });
      } catch (err) {
        console.error("[AuthCallback] Error during exchange:", err);
        setError(err instanceof Error ? err.message : "Autentificarea a eșuat.");
      }
    };

    handleCallback();
  }, [code, login, navigate, searchError]);

  return (
    <div className="card-centered" style={{ marginTop: '10vh' }}>
      <div className="card">
        <div className="brand-row" style={{ marginBottom: 20 }}>
          <img src="/favicon.png" alt="CivicMind" className="logo-img" />
          <span className="login-brand">CivicMind</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">
            {error ? "Eroare Autentificare" : "Se autentifică..."}
          </h1>
          <p className="login-subtitle">
            {error ? error : "Finalizăm conectarea cu Google. Te rugăm să aștepți."}
          </p>
        </div>

        {error && (
          <button
            onClick={() => navigate({ to: "/auth/login" })}
            className="form-button"
            style={{ marginTop: 20 }}
          >
            Înapoi la Login
          </button>
        )}

        {!error && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div className="loading-spinner" />
          </div>
        )}
      </div>
    </div>
  );
}
