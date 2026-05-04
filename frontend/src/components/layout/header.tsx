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
    <header className="app-header">
      {/* Logo */}
      <Link to="/" className="logo-link">
        <img src="/favicon.png" alt="CivicMind" className="logo-img" style={{ width: 22, height: 22 }} />
        <span className="brand">CivicMind</span>
      </Link>

      {/* Nav */}
      <nav className="nav-links">
        {[
          { label: "Feed", href: "/" },
          { label: "Parlamentari", href: "/mps" },
          { label: "Chat", href: "/chat" },
        ].map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="nav-link"
            activeProps={{ className: "nav-link active" }}
            activeOptions={{ exact: true }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right side */}
      <div className="header-actions">
        {isAuthenticated && user && (
          <button className="icon-button">
            <Bell size={15} />
          </button>
        )}
        <button className="icon-button">
          <Search size={15} />
        </button>

        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="avatar-btn">
                  <Avatar className="avatar-size">
                    <AvatarFallback style={{ background: "#f0f0f0", color: "#111", fontSize: 11, fontWeight: 600 }}>
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuLabel className="dropdown-label">
                  <div>{user.username}</div>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>{user.email}</div>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" style={{ fontSize: 13 }}>Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="logout-item" style={{ fontSize: 13 }}>
                Ieșire
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
        <div className="auth-actions">
          <Link to="/auth/login">
            <Button size="sm" variant="outline" className="btn-outline">Autentificare</Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm" variant="outline" className="btn-outline">Înregistrare</Button>
          </Link>
        </div>
        )}
      </div>
    </header>
  );
}
