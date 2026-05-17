import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";

export function AuthCallbackPage() {
  const search = useSearch({ from: "/auth/callback" });
  const { code, error: searchError } = search;
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  const displayError = searchError 
    ? `Eroare de la Google: ${searchError}` 
    : (!code ? "Nu s-a găsit niciun cod de autentificare." : error);

  useEffect(() => {
    // Avoid double-processing in StrictMode
    if (processed.current) return;

    if (searchError || !code) return;

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
            {displayError ? "Eroare Autentificare" : "Se autentifică..."}
          </h1>
          <p className="login-subtitle">
            {displayError ? displayError : "Finalizăm conectarea cu Google. Te rugăm să aștepți."}
          </p>
        </div>

        {displayError && (
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
