import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersPage } from "@/components/admin/admin-users";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});
