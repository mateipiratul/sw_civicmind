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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [county, setCounty] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [metadata, setMetadata] = useState<{ impact_categories: string[], counties: string[] } | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setCounty(user.county || "");
      setSelectedInterests(user.interests || []);
    }
  }, [user]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsMetadataLoading(true);
        const data = await api.getMetadata();
        setMetadata(data);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      } finally {
        setIsMetadataLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      const updated = await api.updateProfile({ 
        username, 
        email, 
        county, 
        interests: selectedInterests 
      });
      updateUser(updated);
      setMessage({ type: "success", text: "Profil actualizat cu succes!" });
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Actualizarea profilului a eșuat" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl py-10 space-y-8 text-[#111]">
      <Breadcrumbs items={[{ label: "Profil" }]} />
      
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Profil Utilizator</h1>
        <p className="text-gray-500 text-lg mt-1.5">Gestionează setările contului și interesele civice.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-none border border-[#e2e2e2] overflow-hidden rounded-xl">
            <CardHeader className="text-center bg-gray-50/50 pb-8 pt-10">
              <div className="mx-auto h-20 w-20 rounded-full bg-white shadow-sm border-2 border-white flex items-center justify-center text-3xl text-gray-400 font-bold uppercase mb-4">
                {user.username?.charAt(0) || "?"}
              </div>
              <CardTitle className="text-xl font-semibold">{user.username || "Utilizator"}</CardTitle>
              <CardDescription className="text-gray-400 font-medium">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 px-6 pb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Rol</span>
                <Badge variant="outline" className="capitalize px-2 py-0.5 font-semibold text-[11px] border-gray-200 text-gray-500">
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Status</span>
                <Badge 
                  variant={user.status === "active" ? "default" : "destructive"} 
                  className={cn(
                    "capitalize px-2 py-0.5 font-semibold text-[11px] border-0",
                    user.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}
                >
                  {user.status}
                </Badge>
              </div>
              <Separator className="bg-[#f0f0f0] my-2" />
              <Button 
                variant="outline" 
                className="w-full font-semibold rounded-lg border-[#e2e2e2] text-sm py-5" 
                onClick={() => refreshUser()}
              >
                Actualizează Datele
              </Button>
              {user.role === "admin" && (
                <Button 
                  variant="secondary" 
                  className="w-full mt-1 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold rounded-lg text-sm py-5"
                  onClick={() => navigate({ to: "/admin/stats" })}
                >
                  Panou Admin
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-none border border-[#e2e2e2] rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/30 px-6 py-6 border-b border-[#f0f0f0]">
              <CardTitle className="text-lg font-semibold">Informații Cont</CardTitle>
              <CardDescription className="text-gray-400">Actualizează detaliile de bază ale profilului tău.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nume utilizator</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="py-5 rounded-lg border-[#e2e2e2] focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="py-5 rounded-lg border-[#e2e2e2] focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#f8f8f8]">
                  <div className="space-y-2">
                    <Label htmlFor="county" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Județ de reședință</Label>
                    <Select value={county} onValueChange={setCounty}>
                      <SelectTrigger className="w-full py-5 rounded-lg border-[#e2e2e2] text-sm">
                        <SelectValue placeholder="Selectează un județ" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {metadata?.counties.map((c) => (
                          <SelectItem key={c} value={c} className="text-sm">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400">Vom prioritiza legile și reprezentanții din acest județ în feed.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#f8f8f8]">
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Interese Civice</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {metadata?.impact_categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left flex items-center justify-between",
                          selectedInterests.includes(cat)
                            ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                            : "bg-white text-gray-500 border-[#e2e2e2] hover:border-gray-300"
                        )}
                      >
                        {cat}
                        {selectedInterests.includes(cat) && <span className="h-1.5 w-1.5 rounded-full bg-white ml-2" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">Selectează ariile care te afectează direct pentru un feed personalizat.</p>
                </div>

                {message && (
                  <div className={cn(
                    "p-4 rounded-lg text-sm font-semibold flex items-center gap-3",
                    message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    {message.text}
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isUpdating} 
                    className="px-10 py-5 rounded-lg font-semibold text-sm bg-[#111] hover:bg-gray-800 active:scale-[0.98] transition-all"
                  >
                    {isUpdating ? "Se salvează..." : "Salvează Modificările"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
