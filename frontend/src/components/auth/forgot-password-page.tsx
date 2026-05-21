import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      await api.requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-centered">
      <div className="card">
        <div className="brand-row">
          <img src="/favicon.png" alt="CivicMind" className="logo-img" />
          <span className="login-brand">CivicMind</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Ai uitat parola?</h1>
          <p className="login-subtitle">
            Introdu adresa de email și îți vom trimite un link pentru a o reseta.
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ color: "#10b981", fontSize: 48, marginBottom: 16 }}>✓</div>
            <h3 style={{ margin: "0 0 8px 0" }}>Email trimis!</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              Dacă adresa <strong>{email}</strong> este asociată unui cont, vei primi un email cu instrucțiunile de resetare.
            </p>
            <Link to="/auth/login" className="form-button" style={{ textDecoration: "none", display: "inline-block" }}>
              Înapoi la Autentificare
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-col">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="form-input"
              />
            </div>

            {error && <p className="error-box">{error}</p>}

            <button type="submit" disabled={isLoading || !email.trim()} className="form-button">
              {isLoading ? "Se trimite..." : "Trimite link-ul de resetare"}
            </button>

            <p className="login-footer" style={{ marginTop: 12 }}>
              <Link to="/auth/login" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 2 }}>
                Înapoi la Autentificare
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
