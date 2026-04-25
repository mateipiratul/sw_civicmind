import { HeadContent, Scripts, createRootRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/layout/header";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

interface RootErrorProps {
  error: Error & { status?: number };
}

function RootErrorComponent({ error }: RootErrorProps) {
  const navigate = useNavigate();
  
  const isUnauthorized = error?.message?.includes("401") || error?.status === 401;
  const isForbidden = error?.message?.includes("403") || error?.status === 403;

  useEffect(() => {
    if (isUnauthorized) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      // Use navigate instead of hard redirect if possible, 
      // but for 401 a hard redirect is often safer to clear all state
      window.location.href = "/auth/login";
    }
  }, [isUnauthorized]);

  if (isUnauthorized) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl shadow-sm border border-[#e2e2e2]">
        <div className="mx-auto w-20 h-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isForbidden ? "Permission Denied" : "Something went wrong"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isForbidden 
              ? "You don't have permission to access this resource." 
              : error?.message || "An unexpected error occurred. Please try again later."}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl shadow-sm border border-[#e2e2e2]">
        <h1 className="text-6xl font-bold text-[#111]">404</h1>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Page Not Found</h2>
          <p className="text-gray-600 mt-2">The page you are looking for does not exist or has been moved.</p>
        </div>
        <Link to="/">
          <Button className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
        <Header />
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Outlet />
        </main>
      </div>
    </RootDocument>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "CivicMind - Intelligent Civic Engine",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
