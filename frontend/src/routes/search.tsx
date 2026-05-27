import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/components/search/search-page";

export type SearchParams = {
  q: string;
  tab: "laws" | "mps" | "all";
  l_status?: string;
  l_initiator?: string;
  l_category?: string;
  l_dateFrom?: string;
  l_dateTo?: string;
  m_party?: string;
  m_county?: string;
  m_chamber?: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const q = typeof search.q === "string" ? search.q : "";
    const tab =
      search.tab === "laws" || search.tab === "mps" || search.tab === "all"
        ? (search.tab as "laws" | "mps" | "all")
        : "all";
    
    return { 
      q, 
      tab,
      l_status: typeof search.l_status === "string" ? search.l_status : undefined,
      l_initiator: typeof search.l_initiator === "string" ? search.l_initiator : undefined,
      l_category: typeof search.l_category === "string" ? search.l_category : undefined,
      l_dateFrom: typeof search.l_dateFrom === "string" ? search.l_dateFrom : undefined,
      l_dateTo: typeof search.l_dateTo === "string" ? search.l_dateTo : undefined,
      m_party: typeof search.m_party === "string" ? search.m_party : undefined,
      m_county: typeof search.m_county === "string" ? search.m_county : undefined,
      m_chamber: typeof search.m_chamber === "string" ? search.m_chamber : undefined,
    };
  },
  component: SearchPage,
});
