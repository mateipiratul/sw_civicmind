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
      // If this page was opened as a popup, postMessage the code to the opener and close.
      try {
        if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
          try {
            window.opener.postMessage({ type: 'civic:google_oauth', code }, window.location.origin);
          } catch (postErr) {
            console.warn('[AuthCallback] postMessage to opener failed, falling back to direct exchange', postErr);
            // fallback to server-side exchange below
          }
          try {
            window.close();
          } catch {
            // Browser may deny scripted popup close; direct exchange remains available.
          }
          return;
        }

        // Normal redirect flow (no opener) - perform server-side exchange here
        const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
        const user = await api.googleLoginWithCode(code, redirectUri);
        login(user);
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
