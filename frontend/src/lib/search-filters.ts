import { useMemo } from "react";
import type { Bill, SearchMP } from "@/lib/api";

export const EMPTY_FILTERS = {
  status: "",
  initiator: "",
  category: "",
  dateFrom: "",
  dateTo: "",
};

export const EMPTY_MP_FILTERS = {
  party: "",
  county: "",
  chamber: "",
};

export type SearchTab = "all" | "laws" | "mps";
export type LawFilters = typeof EMPTY_FILTERS;
export type MpFilters = typeof EMPTY_MP_FILTERS;
export type FilterChip = { key: string; label: string };
export type LawFilterOptions = { statuses: string[]; initiators: string[]; categories: string[] };
export type MpFilterOptions = { parties: string[]; counties: string[]; chambers: string[] };

export function formatChamber(chamber?: string | null) {
  if (!chamber) return "";
  if (chamber === "deputies") return "Camera Deputaților";
  if (chamber === "senate") return "Senat";
  return chamber;
}

export function buildLawFilterChips(filters: LawFilters) {
  const chips: FilterChip[] = [];
  if (filters.status) chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.initiator) chips.push({ key: "initiator", label: `Inițiator: ${filters.initiator}` });
  if (filters.category) chips.push({ key: "category", label: `Categorie: ${filters.category}` });
  if (filters.dateFrom) chips.push({ key: "dateFrom", label: `De la: ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: "dateTo", label: `Până la: ${filters.dateTo}` });
  return chips;
}

export function buildMpFilterChips(filters: MpFilters) {
  const chips: FilterChip[] = [];
  if (filters.party) chips.push({ key: "party", label: `Partid: ${filters.party}` });
  if (filters.county) chips.push({ key: "county", label: `Județ: ${filters.county}` });
  if (filters.chamber) chips.push({ key: "chamber", label: `Comisie: ${formatChamber(filters.chamber)}` });
  return chips;
}

export function filterLaws(laws: Bill[], filters: LawFilters) {
  if (!laws.length) return [];

  return laws.filter((bill) => {
    if (filters.status && bill.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.initiator && bill.initiator_name?.toLowerCase() !== filters.initiator.toLowerCase()) return false;

    if (filters.category) {
      const categories = bill.ai_analysis?.impact_categories || [];
      const normalized = filters.category.toLowerCase();
      if (!categories.some((cat) => cat.toLowerCase() === normalized)) return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      if (!bill.registered_at) return false;
      const billDate = new Date(bill.registered_at);
      if (filters.dateFrom && billDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && billDate > new Date(filters.dateTo)) return false;
    }

    return true;
  });
}

export function filterMps(mps: SearchMP[], filters: MpFilters) {
  if (!mps.length) return [];

  return mps.filter((mp) => {
    if (filters.party && mp.party?.toLowerCase() !== filters.party.toLowerCase()) return false;
    if (filters.county && mp.county?.toLowerCase() !== filters.county.toLowerCase()) return false;
    if (filters.chamber && mp.chamber?.toLowerCase() !== filters.chamber.toLowerCase()) return false;
    return true;
  });
}

export function useFilteredLaws(laws: Bill[], filters: LawFilters) {
  return useMemo(() => filterLaws(laws, filters), [laws, filters]);
}

export function useFilteredMps(mps: SearchMP[], filters: MpFilters) {
  return useMemo(() => filterMps(mps, filters), [mps, filters]);
}
