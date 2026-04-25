import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async (formData) => {
      const values = formData.value;
      if (values.password !== values.confirmPassword) {
        setError("Parolele nu coincid");
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const user = await api.register(values.username, values.email, values.password);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Înregistrarea a eșuat");
      } finally {
        setIsLoading(false);
      }
    },
  });

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
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {(["username", "email", "password", "confirmPassword"] as const).map((name) => {
            const labels: Record<typeof name, string> = {
              username: "Nume utilizator",
              email: "Email",
              password: "Parolă",
              confirmPassword: "Confirmă parola",
            };
            return (
              <form.Field key={name} name={name}>
                {(field) => (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                      {labels[name]}
                    </label>
                    <input
                      type={name.toLowerCase().includes("password") ? "password" : name === "email" ? "email" : "text"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isLoading}
                      style={{
                        padding: "9px 12px",
                        fontSize: 13.5,
                        border: "1px solid var(--border-input)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        outline: "none",
                        fontFamily: "var(--font)",
                        transition: "border-color 0.12s",
                      }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#888"; }}
                      onBlur={(e) => { 
                        (e.target as HTMLInputElement).style.borderColor = "var(--border-input)"; 
                        field.handleBlur(); 
                      }}
                    />
                  </div>
                )}
              </form.Field>
            );
          })}

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

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});
