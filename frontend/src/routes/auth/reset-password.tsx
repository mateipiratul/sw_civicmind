import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

interface ResetSearchParams {
  uid?: string;
  token?: string;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !searchParams.uid || !searchParams.token) return;

    try {
      setIsLoading(true);
      setError(null);
      await api.confirmPasswordReset({
        uid: searchParams.uid,
        token: searchParams.token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare");
    } finally {
      setIsLoading(false);
    }
  };

  if (!searchParams.uid || !searchParams.token) {
    return (
      <div className="card-centered">
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>Link invalid</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Link-ul de resetare este incomplet sau invalid.
          </p>
          <Link to="/auth/login" className="form-button" style={{ textDecoration: "none", display: "inline-block" }}>
            Înapoi la Autentificare
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="card-centered">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ color: "#10b981", fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ marginTop: 0 }}>Parola a fost resetată</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Acum te poți autentifica folosind noua parolă.
          </p>
          <Link to="/auth/login" className="form-button" style={{ textDecoration: "none", display: "inline-block" }}>
            Mergi la Autentificare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-centered">
      <div className="card">
        <div className="brand-row">
          <img src="/favicon.png" alt="CivicMind" className="logo-img" />
          <span className="login-brand">CivicMind</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Alege o nouă parolă</h1>
          <p className="login-subtitle">
            Introdu și confirmă noua ta parolă.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-col">
          <div className="form-group">
            <label className="form-label">Noua parolă</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
                className="form-input"
                style={{ paddingRight: 40, width: "100%", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 4,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmă parola</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className="form-input"
                style={{ paddingRight: 40, width: "100%", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 4,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && !passwordsMatch && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0, marginTop: 4 }}>Parolele nu coincid</p>
            )}
          </div>

          {error && <p className="error-box">{error}</p>}

          <button type="submit" disabled={isLoading || !passwordsMatch} className="form-button">
            {isLoading ? "Se salvează..." : "Salvează parola"}
          </button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>): ResetSearchParams => {
    return {
      uid: search.uid as string | undefined,
      token: search.token as string | undefined,
    };
  },
});
