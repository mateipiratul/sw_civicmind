import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/feed/dashboard-page";

type DashboardSearch = {
  page?: string;
  category?: string;
};

export const Route = createFileRoute("/")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    const parsed: DashboardSearch = {};
    if (typeof search.page === "string") parsed.page = search.page;
    if (typeof search.category === "string") parsed.category = search.category;
    return parsed;
  },
});
