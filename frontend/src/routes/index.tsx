import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/feed/dashboard-page";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => ({
    page: typeof search.page === "string" ? search.page : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
});
