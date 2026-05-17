import { createFileRoute } from "@tanstack/react-router";
import { AdminBillsPage } from "@/components/admin/admin-bills";

export const Route = createFileRoute("/admin/bills")({
  component: AdminBillsPage,
});
