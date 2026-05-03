import { createRootRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
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
    <div className="error-page-container">
      <div className="error-card">
        <div className="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        
        <h1 className="error-title">
          {isForbidden ? "Acces Interzis" : "Ceva n-a mers bine"}
        </h1>
        <p className="error-message">
          {isForbidden 
            ? "Nu ai permisiunea de a accesa această resursă." 
            : error?.message || "A apărut o eroare neașteptată."}
        </p>

        <div className="error-actions">
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
    <div className="error-page-container">
      <div className="error-card">
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Pagina nu a fost găsită</h2>
        <p className="notfound-message">Pagina pe care o cauți nu există.</p>
        <Link to="/">
          <Button className="full-width">
            Înapoi la Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <div className="root-container">
      <Header />
      <main className="root-main">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
});
