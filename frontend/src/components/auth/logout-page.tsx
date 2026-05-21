import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";

export function LogoutPage() {
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
