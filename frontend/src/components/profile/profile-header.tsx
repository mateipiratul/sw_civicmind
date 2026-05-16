import { useAuth } from "@/lib/auth-context";

export function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.username.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="flex items-center gap-5 mb-10">
      <div className="h-16 w-16 rounded-3xl bg-gray-900 text-white flex items-center justify-center text-xl font-black tracking-tight shrink-0 shadow-xl shadow-gray-200">
        {initials}
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Profilul tău</h1>
        <p className="text-sm text-gray-400 font-medium tracking-tight">Gestionează setările și interesele contului CivicMind.</p>
      </div>
    </div>
  );
}
