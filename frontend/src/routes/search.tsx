import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/components/search/search-page";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string; tab: "laws" | "mps" | "all" } => {
    const q = typeof search.q === "string" ? search.q : "";
    const tab =
      search.tab === "laws" || search.tab === "mps" || search.tab === "all"
        ? (search.tab as "laws" | "mps" | "all")
        : "all";
    return { q, tab };
  },
  component: SearchPage,
});
