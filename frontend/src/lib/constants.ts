export const CATEGORIES: { id: string | undefined; label: string }[] = [
  { id: undefined, label: "Pentru Tine" },
  { id: "Fiscal", label: "Fiscal" },
  { id: "Sănătate", label: "Sănătate" },
  { id: "Educație", label: "Educație" },
  { id: "Muncă", label: "Muncă" },
  { id: "Mediu", label: "Mediu" },
  { id: "Justiție", label: "Justiție" },
];

export const CAT_DOTS: Record<string, string> = {
  Fiscal: "#f97316",
  Sănătate: "#22c55e",
  Educație: "#3b82f6",
  Muncă: "#8b5cf6",
  Mediu: "#10b981",
  Justiție: "#ef4444",
};

export const EMPTY_FILTERS: Record<string, string> = {
  status: "",
  initiator: "",
  category: "",
  dateFrom: "",
  dateTo: "",
};

export const EMPTY_MP_FILTERS: Record<string, string> = {
  party: "",
  county: "",
  chamber: "",
};
