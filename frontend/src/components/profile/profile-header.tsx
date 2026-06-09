import { useAuth } from "@/lib/use-auth";
import { Link } from "@tanstack/react-router";

export function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.username.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="flex items-center gap-5 mb-10">
      <div className="h-16 w-16 rounded-3xl bg-gray-900 text-white flex items-center justify-center text-xl font-black tracking-tight shrink-0 shadow-xl shadow-gray-200 overflow-hidden">
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.username} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          initials
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{user.username}</h1>
          {user.role === "admin" && (
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-md">Admin</span>
          )}
        </div>
        <p className="text-sm text-gray-400 font-medium tracking-tight">Gestionează setările și interesele contului CivicMind.</p>
        {user.role === "admin" && (
          <div className="pt-1">
            <Link 
              to="/admin/stats" 
              className="inline-block px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all"
            >
              Admin Panel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
