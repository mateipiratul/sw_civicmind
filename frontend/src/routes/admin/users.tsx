import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { User, PaginatedUsers } from "@/lib/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b">
          <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
          <td className="px-6 py-4">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </td>
          <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
          <td className="px-6 py-4"><Skeleton className="h-8 w-32 ml-auto rounded-xl" /></td>
        </tr>
      ))}
    </>
  );
}

function AdminUsersPage() {
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  
  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    userId: number;
    username: string;
    newStatus: User["status"];
  } | null>(null);

  const loadUsers = async (targetPage: number) => {
    try {
      setIsLoading(true);
      const res = await api.getAdminUsers(targetPage);
      setData(res);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page]);

  const handleStatusChange = async (userId: number, newStatus: string, username: string) => {
    // If changing to a critical status, show confirmation
    if (newStatus === "banned" || newStatus === "suspended") {
      setConfirmDialog({
        isOpen: true,
        userId,
        username,
        newStatus: newStatus as User["status"],
      });
      return;
    }

    await executeStatusChange(userId, newStatus as User["status"]);
  };

  const executeStatusChange = async (userId: number, newStatus: User["status"]) => {
    try {
      setIsUpdating(userId);
      await api.updateUserStatus(userId, newStatus);
      // Update local state instead of reloading everything
      if (data) {
        setData({
          ...data,
          users: data.users.map(u => 
            u.id === userId ? { ...u, status: newStatus } : u
          )
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(null);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">User Management</h1>
          <p className="text-gray-500 font-medium">Monitor and control user accounts on the platform.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadUsers(page)}
          className="rounded-xl font-bold border-gray-200"
        >
          Refresh Users
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 font-bold">
          {error}
        </div>
      )}

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-black tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">ID</th>
                  <th className="px-6 py-5">User</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <AdminUsersSkeleton />
                ) : !data || data.users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">#{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{user.username}</span>
                          <span className="text-xs text-gray-500 font-medium">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs">
                        <Badge variant="outline" className="font-black border-gray-200">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={user.status === "active" ? "default" : "destructive"}
                          className="capitalize font-bold px-3 py-1"
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Select 
                          value={user.status} 
                          onValueChange={(val) => handleStatusChange(user.id, val, user.username)}
                          disabled={isUpdating === user.id || user.role === "admin"}
                        >
                          <SelectTrigger className="h-10 w-36 ml-auto rounded-xl border-gray-200 font-bold focus:ring-gray-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-gray-100">
                            <SelectItem value="active" className="font-bold p-3">Active</SelectItem>
                            <SelectItem value="suspended" className="font-bold p-3">Suspended</SelectItem>
                            <SelectItem value="banned" className="font-bold p-3 text-red-600">Banned</SelectItem>
                            <SelectItem value="inactive" className="font-bold p-3">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <AlertDialog 
          open={confirmDialog.isOpen} 
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent className="rounded-2xl shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive text-2xl font-black">
                Confirm Status Change
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium">
                Are you sure you want to change <strong>{confirmDialog.username}</strong>'s status to 
                <span className="uppercase font-black text-destructive ml-1">{confirmDialog.newStatus}</span>? 
                {confirmDialog.newStatus === "banned" && " This will prevent them from accessing the platform entirely."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold border-gray-200">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => executeStatusChange(confirmDialog.userId, confirmDialog.newStatus)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold shadow-md shadow-red-100"
              >
                Confirm Change
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {data && data.totalPages > 1 && (
        <div className="pt-4">
          <Pagination 
            currentPage={page} 
            totalPages={data.totalPages} 
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
}
