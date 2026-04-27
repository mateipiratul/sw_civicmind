import { createRootRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface RootErrorProps {
  error: Error & { status?: number };
}

function RootErrorComponent({ error }: RootErrorProps) {
  const navigate = useNavigate();
  
  const isUnauthorized = error?.message?.includes("401") || error?.status === 401;
  const isForbidden = error?.message?.includes("403") || error?.status === 403;

  useEffect(() => {
    if (isUnauthorized) {
      // Clear auth storage directly without useAuth (error component is outside AuthProvider)
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
    }
  }, [isUnauthorized, navigate]);

  if (isUnauthorized) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center", background: "white", padding: 32, borderRadius: 12, border: "1px solid #e2e2e2" }}>
        <div style={{ margin: "0 auto 24px", width: 80, height: 80, background: "#f5f5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          {isForbidden ? "Acces Interzis" : "Ceva n-a mers bine"}
        </h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          {isForbidden 
            ? "Nu ai permisiunea de a accesa această resursă." 
            : error?.message || "A apărut o eroare neașteptată."}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button onClick={() => window.location.reload()}>
            Reîncarcă
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Acasă
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center", background: "white", padding: 32, borderRadius: 12, border: "1px solid #e2e2e2" }}>
        <h1 style={{ fontSize: 64, fontWeight: 800, marginBottom: 8, color: "#111" }}>404</h1>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Pagina nu a fost găsită</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>Pagina pe care o cauți nu există.</p>
        <Link to="/">
          <Button style={{ width: "100%" }}>
            Înapoi la Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
        <Header />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
});
