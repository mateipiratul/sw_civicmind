import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-10 space-y-8">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-96" />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="items-center">
              <Skeleton className="h-20 w-20 rounded-full mb-2" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Separator />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, refreshUser, updateUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      const updated = await api.updateProfile({ username, email });
      updateUser(updated);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to update profile" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl py-10 space-y-8">
      <Breadcrumbs items={[{ label: "Profile" }]} />
      
      <div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">User Profile</h1>
        <p className="text-gray-500 text-lg mt-1">Manage your account settings and civic interests.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-none border border-[#e2e2e2] overflow-hidden">
            <CardHeader className="text-center bg-gray-50 pb-8">
              <div className="mx-auto h-24 w-24 rounded-full bg-white shadow-sm border-4 border-white flex items-center justify-center text-4xl text-gray-600 font-black uppercase mb-3">
                {user.username?.charAt(0) || "?"}
              </div>
              <CardTitle className="text-2xl font-bold">{user.username || "User"}</CardTitle>
              <CardDescription className="text-gray-500 font-medium">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Role</span>
                <Badge variant="outline" className="capitalize px-3 py-1 font-bold">
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Status</span>
                <Badge 
                  variant={user.status === "active" ? "default" : "destructive"} 
                  className="capitalize px-3 py-1 font-bold"
                >
                  {user.status}
                </Badge>
              </div>
              <Separator className="bg-gray-100" />
              <Button 
                variant="outline" 
                className="w-full font-bold rounded-xl" 
                onClick={() => refreshUser()}
              >
                Refresh Profile
              </Button>
              {user.role === "admin" && (
                <Button 
                  variant="secondary" 
                  className="w-full mt-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl"
                  onClick={() => navigate({ to: "/admin/stats" })}
                >
                  Admin Panel
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-none border border-[#e2e2e2] rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50">
              <CardTitle className="text-2xl font-bold">Profile Information</CardTitle>
              <CardDescription className="text-base">Update your account details to keep your profile current.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-bold text-gray-700">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="py-6 rounded-xl border-gray-200 focus:ring-gray-400 text-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-gray-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="py-6 rounded-xl border-gray-200 focus:ring-gray-400 text-lg"
                    required
                  />
                </div>

                {message && (
                  <div className={cn(
                    "p-4 rounded-xl text-sm font-bold flex items-center gap-3",
                    message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      message.type === "success" ? "bg-green-500" : "bg-red-500"
                    )} />
                    {message.text}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isUpdating} 
                  className="px-8 py-6 rounded-xl font-bold text-lg shadow-lg bg-[#111] hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
