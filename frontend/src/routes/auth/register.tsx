import { useState, useMemo } from "react";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PASSWORD_REQUIREMENTS = {
  minLength: { regex: /.{8,}/, label: "Minim 8 caractere" },
  uppercase: { regex: /[A-Z]/, label: "Cel puțin o literă mare" },
  lowercase: { regex: /[a-z]/, label: "Cel puțin o literă mică" },
  digit: { regex: /\d/, label: "Cel puțin o cifră" },
  special: { regex: /[!@#$%^&*()_\-+=\[\]{}|\\:;"'<>,.?/`~]/, label: "Cel puțin un caracter special" },
  noSpaces: { regex: /^\S*$/, label: "Spațiile albe nu sunt permise" },
};

function checkPasswordRequirements(password: string) {
  return Object.fromEntries(
    Object.entries(PASSWORD_REQUIREMENTS).map(([key, { regex }]) => [
      key,
      regex.test(password),
    ])
  ) as Record<string, boolean>;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const passwordRequirements = useMemo(() => checkPasswordRequirements(password), [password]);
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleRegister = async () => {
    console.log("Se trimite formularul de înregistrare");
    
    if (!username.trim()) {
      setError("Numele de utilizator este obligatoriu");
      return;
    }
    
    if (!email.trim()) {
      setError("Email-ul este obligatoriu");
      return;
    }
    
    if (!allRequirementsMet) {
      setError("Parola nu îndeplinește toate cerințele");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolele nu se potrivesc");
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
    <div className="card-centered">
      <div className="card">
        {/* Brand */}
        <div className="brand-row">
          <img src="/favicon.png" alt="CivicMind" className="logo-img" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>CivicMind</span>
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
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Nume utilizator</label>
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
              onChange={(e) => {
                setPassword(e.target.value);
                setShowPasswordRequirements(true);
              }}
              onFocus={() => setShowPasswordRequirements(true)}
              onBlur={() => {
                if (password.length === 0) setShowPasswordRequirements(false);
              }}
              disabled={isLoading}
              style={inputStyle}
            />
            {showPasswordRequirements && password.length > 0 && (
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4, marginTop: 4, padding: 10, background: "#f9fafb", borderRadius: 6, border: "1px solid var(--border-input)" }}>
                {Object.entries(PASSWORD_REQUIREMENTS).map(([key, { label }]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: passwordRequirements[key as keyof typeof passwordRequirements] ? "#10b981" : "#d1d5db", fontSize: 14, fontWeight: 600 }}>
                      {passwordRequirements[key as keyof typeof passwordRequirements] ? "✓" : "○"}
                    </span>
                    <span style={{ color: passwordRequirements[key as keyof typeof passwordRequirements] ? "#10b981" : "#6b7280" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            {password.length > 0 && !passwordsMatch && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0, marginTop: 4 }}>Parolele nu coincid</p>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 12.5, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim() || !email.trim() || !allRequirementsMet || !passwordsMatch}
            style={{
              padding: "11px 16px",
              borderRadius: "var(--radius-sm, 6px)",
              background: isLoading || !username.trim() || !email.trim() || !allRequirementsMet || !passwordsMatch ? "#d1d5db" : "var(--primary)",
              color: "var(--primary-text)",
              fontSize: 14,
              fontWeight: 500,
              cursor: (isLoading || !username.trim() || !email.trim() || !allRequirementsMet || !passwordsMatch) ? "not-allowed" : "pointer",
              opacity: (isLoading || !username.trim() || !email.trim() || !allRequirementsMet || !passwordsMatch) ? 0.6 : 1,
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
