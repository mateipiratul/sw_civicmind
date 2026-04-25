import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { AdminStats } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, BarChart3, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/stats")({
  component: AdminStatsPage,
});

function AdminStatsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return <AdminStatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 font-bold shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          {error || "No data available"}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      subValue: `${stats.activeUsers} active`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Bills",
      value: stats.totalBills,
      subValue: `${stats.activeBills} active / ${stats.analyzedBills} analyzed`,
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Platform Health",
      value: `${stats.analyzedBills}%`,
      subValue: "AI Analysis Coverage",
      icon: Wallet,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-500 font-medium text-lg mt-1">Real-time platform metrics and ecosystem health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/50">
              <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</div>
              <p className="text-sm font-bold text-gray-400 mt-1">{stat.subValue}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-xl p-8 border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Activity log coming soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Bill Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-xl p-8 border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Visualization engine coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
