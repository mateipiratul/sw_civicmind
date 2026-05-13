import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X, BadgeCheck } from "lucide-react";
import { api, type Bill, type GlobalSearchResponse, type SearchMP } from "@/lib/api";
import { BillCard } from "@/components/bill-card";
import { Button } from "@/components/ui/button";

const EMPTY_FILTERS = {
  status: "",
  initiator: "",
  category: "",
  dateFrom: "",
  dateTo: "",
};

const EMPTY_MP_FILTERS = {
  party: "",
  county: "",
  chamber: "",
};

type SearchTab = "all" | "laws" | "mps";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string; tab: SearchTab } => {
    const q = typeof search.q === "string" ? search.q : "";
    const tab =
      search.tab === "laws" || search.tab === "mps" || search.tab === "all"
        ? (search.tab as SearchTab)
        : "all";
    return { q, tab };
  },
  component: SearchPage,
});

function formatChamber(chamber?: string | null) {
  if (!chamber) return "";
  if (chamber === "deputies") return "Camera Deputaților";
  if (chamber === "senate") return "Senat";
  return chamber;
}

function MpResultCard({ mp, query }: { mp: SearchMP; query: string }) {
  const relation = mp.relation;
  const relatedBills = relation?.relatedBills ?? 0;
  const forVotes = relation?.forVotes ?? 0;
  const keyword = relation?.keyword || query;
  const relationText = relatedBills > 0
    ? `A votat [PENTRU] ${forVotes} legi legate de '${keyword}'.`
    : `Nu am găsit voturi directe legate de '${keyword}'.`;

  return (
    <div className="search-mp-card">
      <div className="search-mp-header">
        <div>
          <div className="search-mp-name">{mp.mp_name}</div>
          <div className="search-mp-meta">
            {mp.party && <span>{mp.party}</span>}
            {mp.county && <span> · {mp.county}</span>}
            {mp.chamber && <span> · {formatChamber(mp.chamber)}</span>}
          </div>
        </div>
        {mp.impact_score?.score != null && (
          <div className="search-mp-score">{mp.impact_score.score.toFixed(0)}</div>
        )}
      </div>
      <div className="search-mp-relation">{relationText}</div>
      <Link to="/mps/$slug" params={{ slug: mp.mp_slug }} className="search-mp-link">
        Vezi profil complet
      </Link>
    </div>
  );
}

function buildLawFilterChips(filters: typeof EMPTY_FILTERS) {
  const chips: { key: string; label: string }[] = [];
  if (filters.status) chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.initiator) chips.push({ key: "initiator", label: `Inițiator: ${filters.initiator}` });
  if (filters.category) chips.push({ key: "category", label: `Categorie: ${filters.category}` });
  if (filters.dateFrom) chips.push({ key: "dateFrom", label: `De la: ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: "dateTo", label: `Până la: ${filters.dateTo}` });
  return chips;
}

function buildMpFilterChips(filters: typeof EMPTY_MP_FILTERS) {
  const chips: { key: string; label: string }[] = [];
  if (filters.party) chips.push({ key: "party", label: `Partid: ${filters.party}` });
  if (filters.county) chips.push({ key: "county", label: `Județ: ${filters.county}` });
  if (filters.chamber) chips.push({ key: "chamber", label: `Comisie: ${formatChamber(filters.chamber)}` });
  return chips;
}

function SearchPage() {
  const { q, tab } = Route.useSearch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SearchTab>(tab);
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lawFilters, setLawFilters] = useState(EMPTY_FILTERS);
  const [mpFilters, setMpFilters] = useState(EMPTY_MP_FILTERS);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    setLawFilters(EMPTY_FILTERS);
    setMpFilters(EMPTY_MP_FILTERS);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .searchGlobal(q)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : "Nu am putut încărca rezultatele"))
      .finally(() => setLoading(false));
  }, [q]);

  const laws = data?.laws ?? [];
  const mps = data?.mps ?? [];
  const exactMatch = data?.exactMatch ?? null;

  const filteredLaws = useMemo(() => {
    if (!laws.length) return [] as Bill[];
    return laws.filter((bill) => {
      if (lawFilters.status && bill.status?.toLowerCase() !== lawFilters.status.toLowerCase()) return false;
      if (lawFilters.initiator && bill.initiator_name?.toLowerCase() !== lawFilters.initiator.toLowerCase()) return false;
      if (lawFilters.category) {
        const categories = bill.ai_analysis?.impact_categories || [];
        const normalized = lawFilters.category.toLowerCase();
        if (!categories.some((cat) => cat.toLowerCase() === normalized)) return false;
      }
      if (lawFilters.dateFrom || lawFilters.dateTo) {
        if (!bill.registered_at) return false;
        const billDate = new Date(bill.registered_at);
        if (lawFilters.dateFrom && billDate < new Date(lawFilters.dateFrom)) return false;
        if (lawFilters.dateTo && billDate > new Date(lawFilters.dateTo)) return false;
      }
      return true;
    });
  }, [laws, lawFilters]);

  const filteredMps = useMemo(() => {
    if (!mps.length) return [] as SearchMP[];
    return mps.filter((mp) => {
      if (mpFilters.party && mp.party?.toLowerCase() !== mpFilters.party.toLowerCase()) return false;
      if (mpFilters.county && mp.county?.toLowerCase() !== mpFilters.county.toLowerCase()) return false;
      if (mpFilters.chamber && mp.chamber?.toLowerCase() !== mpFilters.chamber.toLowerCase()) return false;
      return true;
    });
  }, [mps, mpFilters]);

  const lawChips = buildLawFilterChips(lawFilters);
  const mpChips = buildMpFilterChips(mpFilters);
  const lawFilterCount = lawChips.length;
  const mpFilterCount = mpChips.length;

  const topLaws = filteredLaws.slice(0, 3);
  const topMps = filteredMps.slice(0, 3);

  const showLawEmptyState = activeTab === "laws" && lawFilterCount > 0 && filteredLaws.length === 0;
  const showMpEmptyState = activeTab === "mps" && mpFilterCount > 0 && filteredMps.length === 0;

  const handleTabChange = (nextTab: SearchTab) => {
    setActiveTab(nextTab);
    navigate({ to: "/search", search: { q, tab: nextTab } });
  };

  return (
    <div className="search-page">
      <div className="search-hero">
        <div>
          <div className="search-kicker">Rezultate globale</div>
          <h1>Rezultate pentru "{q || "—"}"</h1>
          <p>Explorează rapid legi și parlamentari legați de același subiect.</p>
        </div>
        <div className="search-metrics">
          <div>
            <span>Legi</span>
            <strong>{data?.counts.laws ?? 0}</strong>
          </div>
          <div>
            <span>Parlamentari</span>
            <strong>{data?.counts.mps ?? 0}</strong>
          </div>
        </div>
      </div>

      <div className="search-tabs">
        {[
          { id: "all", label: "Toate" },
          { id: "laws", label: "Legi" },
          { id: "mps", label: "Parlamentari" },
        ].map((item) => (
          <button
            key={item.id}
            className={`search-tab ${activeTab === item.id ? "active" : ""}`}
            onClick={() => handleTabChange(item.id as SearchTab)}
          >
            {item.label}
          </button>
        ))}

        {(activeTab === "laws" || activeTab === "mps") && (
          <button className="filter-button" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={14} /> Filtrează
            {(activeTab === "laws" && lawFilterCount > 0) && <span className="filter-count">{lawFilterCount}</span>}
            {(activeTab === "mps" && mpFilterCount > 0) && <span className="filter-count">{mpFilterCount}</span>}
          </button>
        )}
      </div>

      {loading && <div className="search-loading">Se încarcă rezultatele...</div>}
      {error && <div className="error-box">{error}</div>}
      {!q && !loading && <div className="search-empty">Introdu un termen de căutare pentru a vedea rezultate.</div>}

      {activeTab === "all" && !loading && q && (
        <div className="search-results">
          {exactMatch && (
            <div className="exact-match">
              <div className="exact-match-label">
                <BadgeCheck size={14} /> Exact Match
              </div>
              <div className="search-grid">
                <BillCard bill={exactMatch} />
              </div>
            </div>
          )}

          <div className="search-section-block">
            <div className="search-section-header">
              <h2>Top Legi</h2>
              <Button variant="outline" size="sm" onClick={() => handleTabChange("laws")}>Vezi toate</Button>
            </div>
            {topLaws.length === 0 ? (
              <div className="search-empty">Nu am găsit legi relevante.</div>
            ) : (
              <div className="search-grid">
                {topLaws.map((bill) => (
                  <BillCard key={bill.idp} bill={bill} />
                ))}
              </div>
            )}
          </div>

          <div className="search-section-block">
            <div className="search-section-header">
              <h2>Top Parlamentari</h2>
              <Button variant="outline" size="sm" onClick={() => handleTabChange("mps")}>Vezi toate</Button>
            </div>
            {topMps.length === 0 ? (
              <div className="search-empty">Nu am găsit parlamentari relevanți.</div>
            ) : (
              <div className="search-mp-grid">
                {topMps.map((mp) => (
                  <MpResultCard key={mp.mp_slug} mp={mp} query={q} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "laws" && !loading && q && (
        <div className="search-results">
          {lawChips.length > 0 && (
            <div className="filter-chips">
              {lawChips.map((chip) => (
                <button
                  key={chip.key}
                  className="filter-chip"
                  onClick={() => setLawFilters({ ...lawFilters, [chip.key]: "" })}
                >
                  {chip.label} <X size={12} />
                </button>
              ))}
            </div>
          )}

          {exactMatch && (
            <div className="exact-match">
              <div className="exact-match-label">
                <BadgeCheck size={14} /> Exact Match
              </div>
              <div className="search-grid">
                <BillCard bill={exactMatch} />
              </div>
            </div>
          )}

          {showLawEmptyState ? (
            <div className="search-empty-state">
              <p>Nu am găsit rezultate cu aceste filtre. Încearcă să elimini din filtrele selectate.</p>
              <Button onClick={() => setLawFilters(EMPTY_FILTERS)}>Șterge filtrele</Button>
            </div>
          ) : (
            <div className="search-grid">
              {filteredLaws.map((bill) => (
                <BillCard key={bill.idp} bill={bill} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "mps" && !loading && q && (
        <div className="search-results">
          {mpChips.length > 0 && (
            <div className="filter-chips">
              {mpChips.map((chip) => (
                <button
                  key={chip.key}
                  className="filter-chip"
                  onClick={() => setMpFilters({ ...mpFilters, [chip.key]: "" })}
                >
                  {chip.label} <X size={12} />
                </button>
              ))}
            </div>
          )}

          {showMpEmptyState ? (
            <div className="search-empty-state">
              <p>Nu am găsit rezultate cu aceste filtre. Încearcă să elimini din filtrele selectate.</p>
              <Button onClick={() => setMpFilters(EMPTY_MP_FILTERS)}>Șterge filtrele</Button>
            </div>
          ) : (
            <div className="search-mp-grid">
              {filteredMps.map((mp) => (
                <MpResultCard key={mp.mp_slug} mp={mp} query={q} />
              ))}
            </div>
          )}
        </div>
      )}

      {filtersOpen && (
        <div className="filter-overlay" onClick={() => setFiltersOpen(false)}>
          <div className="filter-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="filter-header">
              <div>
                <h3>Filtrează</h3>
                <p>{activeTab === "laws" ? "Selectează filtre pentru Legi" : "Selectează filtre pentru Parlamentari"}</p>
              </div>
              <button className="icon-button" onClick={() => setFiltersOpen(false)}>
                <X size={14} />
              </button>
            </div>

            {activeTab === "laws" ? (
              <div className="filter-body">
                <label>
                  Status
                  <select
                    value={lawFilters.status}
                    onChange={(event) => setLawFilters({ ...lawFilters, status: event.target.value })}
                  >
                    <option value="">Toate statusurile</option>
                    {data?.filters.laws.statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Inițiator
                  <select
                    value={lawFilters.initiator}
                    onChange={(event) => setLawFilters({ ...lawFilters, initiator: event.target.value })}
                  >
                    <option value="">Toți inițiatorii</option>
                    {data?.filters.laws.initiators.map((initiator) => (
                      <option key={initiator} value={initiator}>{initiator}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Categorie
                  <select
                    value={lawFilters.category}
                    onChange={(event) => setLawFilters({ ...lawFilters, category: event.target.value })}
                  >
                    <option value="">Toate categoriile</option>
                    {data?.filters.laws.categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Interval
                  <div className="filter-range">
                    <input
                      type="date"
                      value={lawFilters.dateFrom}
                      onChange={(event) => setLawFilters({ ...lawFilters, dateFrom: event.target.value })}
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={lawFilters.dateTo}
                      onChange={(event) => setLawFilters({ ...lawFilters, dateTo: event.target.value })}
                    />
                  </div>
                </label>
              </div>
            ) : (
              <div className="filter-body">
                <label>
                  Partid
                  <select
                    value={mpFilters.party}
                    onChange={(event) => setMpFilters({ ...mpFilters, party: event.target.value })}
                  >
                    <option value="">Toate partidele</option>
                    {data?.filters.mps.parties.map((party) => (
                      <option key={party} value={party}>{party}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Județ
                  <select
                    value={mpFilters.county}
                    onChange={(event) => setMpFilters({ ...mpFilters, county: event.target.value })}
                  >
                    <option value="">Toate județele</option>
                    {data?.filters.mps.counties.map((county) => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Comisie
                  <select
                    value={mpFilters.chamber}
                    onChange={(event) => setMpFilters({ ...mpFilters, chamber: event.target.value })}
                  >
                    <option value="">Toate comisiile</option>
                    {data?.filters.mps.chambers.map((chamber) => (
                      <option key={chamber} value={chamber}>{formatChamber(chamber)}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="filter-footer">
              <Button
                variant="outline"
                onClick={() => {
                  if (activeTab === "laws") setLawFilters(EMPTY_FILTERS);
                  if (activeTab === "mps") setMpFilters(EMPTY_MP_FILTERS);
                }}
              >
                Reset
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>Aplică</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
