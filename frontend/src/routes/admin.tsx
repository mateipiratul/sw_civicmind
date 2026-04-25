import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-lg font-bold text-indigo-600">Admin Panel</span>
              <nav className="flex items-center gap-4">
                <Link
                  to="/admin/stats"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md transition-colors"
                  activeProps={{ className: "bg-indigo-50 text-indigo-600" }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/users"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md transition-colors"
                  activeProps={{ className: "bg-indigo-50 text-indigo-600" }}
                >
                  Users
                </Link>
                <Link
                  to="/admin/bills"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md transition-colors"
                  activeProps={{ className: "bg-indigo-50 text-indigo-600" }}
                >
                  Bills
                </Link>
              </nav>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm">
                Exit Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 max-w-7xl py-8">
        <Outlet />
      </main>
    </div>
  );
}
