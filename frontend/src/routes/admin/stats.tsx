import { createFileRoute } from "@tanstack/react-router";
import { AdminStatsPage } from "@/components/admin/admin-stats";

export const Route = createFileRoute("/admin/stats")({
  component: AdminStatsPage,
});
