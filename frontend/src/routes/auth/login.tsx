import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGoogleLogin } from "@react-oauth/google";
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

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError(null);
        const user = await api.googleLogin(tokenResponse.access_token);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Autentificarea Google a esuat");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Autentificarea Google a fost anulată sau a esuat");
    },
  });

  return (
    <div className="card-centered">
      <div className="card">
        <div className="brand-row">
          <img src="/favicon.png" alt="CivicMind" className="logo-img" />
          <span className="login-brand">CivicMind</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">
            Bine ai venit
          </h1>
          <p className="login-subtitle">
            Intră în cont pentru a vedea feed-ul și profilul tău civic.
          </p>
        </div>

        <form onSubmit={handleLogin} className="form-col">
          <div className="form-group">
            <label className="form-label">
              Nume utilizator
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
              autoComplete="username"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Parola
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              className="form-input"
            />
          </div>

          {error && <p className="error-box">{error}</p>}

          <button type="submit" disabled={isLoading} className="form-button">
            {isLoading ? "Se autentifică..." : "Autentifica-te"}
          </button>
        </form>

        <div className="form-divider">
          <div className="form-divider-line" />
          <span className="form-divider-text">sau</span>
          <div className="form-divider-line" />
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => googleLogin()}
          className="oauth-button"
        >
          <GoogleIcon />
          Continuă cu Google
        </button>

        <p className="login-footer">
          Continuând, esti de acord cu{" "}
          <a href="#" className="footer-link">
            Termenii de utilizare
          </a>{" "}
          si{" "}
          <a href="#" className="footer-link">
            Politica de confidențialitate
          </a>.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});
