import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

function LogoutPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate({ to: "/auth/login", replace: true });
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ fontSize: 13, color: "#888" }}>Se deconectează...</p>
    </div>
  );
}

export const Route = createFileRoute("/auth/logout")({
  component: LogoutPage,
});
