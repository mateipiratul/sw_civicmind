import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/" });
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "white",
        borderBottom: "1px solid #e2e2e2",
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 32,
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flexShrink: 0 }}>
        <span style={{ width: 16, height: 16, background: "#111", borderRadius: 3, display: "block" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111", letterSpacing: "-0.2px" }}>CivicMind</span>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
        {[
          { label: "Feed", href: "/" },
          { label: "MPs", href: "/mps" },
          { label: "Chat", href: "/chat" },
        ].map((item) => (
          <Link
            key={item.href}
            to={item.href}
            style={{ fontSize: 13.5, color: "#888", textDecoration: "none", padding: "4px 10px", borderRadius: 6 }}
            activeProps={{ style: { fontSize: 13.5, color: "#111", fontWeight: 600, textDecoration: "none", padding: "4px 10px", borderRadius: 6, background: "#f5f5f5" } }}
            activeOptions={{ exact: true }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#888", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <Bell size={15} />
        </button>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#888", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <Search size={15} />
        </button>

        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" style={{ padding: 0, width: 28, height: 28, borderRadius: "50%", overflow: "hidden" }}>
                <Avatar style={{ width: 28, height: 28 }}>
                  <AvatarFallback style={{ background: "#f0f0f0", color: "#111", fontSize: 11, fontWeight: 600 }}>
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
              <DropdownMenuLabel style={{ fontWeight: 500, fontSize: 13 }}>
                <div>{user.username}</div>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" style={{ fontSize: 13 }}>Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} style={{ fontSize: 13, color: "#e53e3e" }}>
                Ieșire
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth/login">
            <Button size="sm" variant="outline" style={{ fontSize: 12, height: 28, padding: "0 12px" }}>
              Autentificare
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
