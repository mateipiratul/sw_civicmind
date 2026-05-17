import { useEffect, useMemo, useRef, useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const QUICK_FILTERS = ["Sănătate", "Educație", "Mediu", "Justiție", "Fiscal", "Muncă"];

function normalizeSearch(search: Record<string, unknown>) {
  return typeof search.q === "string" ? search.q : "";
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const searchState = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>,
  });
  
  // Derived state to initialize/sync search input with URL
  const [value, setValue] = useState(() => normalizeSearch(searchState));
  
  // Keep input in sync with URL changes (e.g., browser back/forward)
  const currentUrlQ = normalizeSearch(searchState);
  const [prevUrlQ, setPrevUrlQ] = useState(currentUrlQ);
  if (currentUrlQ !== prevUrlQ) {
    setPrevUrlQ(currentUrlQ);
    setValue(currentUrlQ);
  }

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ["trending-topics"],
    queryFn: () => api.getTrendingTopics(),
    enabled: open, // Only fetch when dropdown is open
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const topics = useMemo(() => data?.topics || [], [data?.topics]);
  const error = queryError instanceof Error ? queryError.message : null;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const submitSearch = (nextValue: string, tab?: "all" | "laws" | "mps") => {
    const trimmed = nextValue.trim();
    if (!trimmed) return;
    navigate({ to: "/search", search: { q: trimmed, tab: tab || "all" } });
    setOpen(false);
  };

  const hasValue = value.trim().length > 0;
  const shouldShowDropdown = open;

  const topTopics = useMemo(() => topics.slice(0, 6), [topics]);

  return (
    <div className="global-search" ref={containerRef}>
      <div className={`global-search-input ${open ? "is-open" : ""}`}>
        <Search size={15} className="global-search-icon" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitSearch(value);
            }
          }}
          placeholder="Căutați un subiect (ex: Sănătate) sau un cod de lege (ex: PL-x 218/2026)"
          aria-label="Căutare globală"
        />
      </div>

      {shouldShowDropdown && (
        <div className="global-search-dropdown">
          {!hasValue ? (
            <>
              <div className="search-section">
                <div className="search-section-title">
                  <TrendingUp size={14} /> Trending Topics
                </div>
                {loading && <div className="search-empty">Se încarcă subiectele...</div>}
                {error && !loading && <div className="search-empty">{error}</div>}
                {!loading && !error && topTopics.length === 0 && (
                  <div className="search-empty">Nu există încă subiecte populare.</div>
                )}
                {!loading && !error && topTopics.length > 0 && (
                  <div className="search-topic-grid">
                    {topTopics.map((topic) => (
                      <button
                        key={topic.label}
                        className="search-topic-card"
                        onClick={() => submitSearch(topic.label, "laws")}
                      >
                        <span>{topic.label}</span>
                        <span className="search-topic-count">{topic.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-section">
                <div className="search-section-title">Filtre rapide</div>
                <div className="search-chip-row">
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      className="search-chip"
                      onClick={() => submitSearch(filter, "laws")}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="search-section compact">
              <div className="search-hint">
                Apasă Enter pentru a căuta în Legi și Parlamentari.
              </div>
              <div className="search-actions">
                <button className="search-action" onClick={() => submitSearch(value, "laws")}>
                  Caută în Legi
                </button>
                <button className="search-action" onClick={() => submitSearch(value, "mps")}>
                  Caută în Parlamentari
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
