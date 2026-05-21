import { useEffect, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatChamber } from "@/lib/utils";
import type {
  LawFilterOptions,
  LawFilters,
  MpFilterOptions,
  MpFilters,
  SearchTab,
} from "@/lib/search-filters";

type FilterDrawerProps = {
  open: boolean;
  activeTab: SearchTab;
  lawFilters: LawFilters;
  mpFilters: MpFilters;
  lawOptions: LawFilterOptions;
  mpOptions: MpFilterOptions;
  onClose: () => void;
  onReset: () => void;
  onLawChange: (key: keyof LawFilters, value: string) => void;
  onMpChange: (key: keyof MpFilters, value: string) => void;
};

export function FilterDrawer({
  open,
  activeTab,
  lawFilters,
  mpFilters,
  lawOptions,
  mpOptions,
  onClose,
  onReset,
  onLawChange,
  onMpChange,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open || activeTab === "all") return null;

  const handleLawSelectChange =
    (key: "status" | "initiator" | "category") => (event: ChangeEvent<HTMLSelectElement>) =>
      onLawChange(key, event.target.value);
  const handleLawDateChange = (key: "dateFrom" | "dateTo") => (event: ChangeEvent<HTMLInputElement>) =>
    onLawChange(key, event.target.value);
  const handleMpSelectChange = (key: keyof MpFilters) => (event: ChangeEvent<HTMLSelectElement>) =>
    onMpChange(key, event.target.value);

  return (
    <div
      className="filter-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="filter-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
      >
        <div className="filter-header">
          <div>
            <h3 id="filter-title">Filtrează</h3>
            <p>{activeTab === "laws" ? "Selectează filtre pentru Legi" : "Selectează filtre pentru Parlamentari"}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Închide">
            <X size={14} />
          </button>
        </div>

        {activeTab === "laws" ? (
          <div className="filter-body">
            <label>
              Status
              <select value={lawFilters.status} onChange={handleLawSelectChange("status")}>
                <option value="">Toate statusurile</option>
                {lawOptions.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Inițiator
              <select value={lawFilters.initiator} onChange={handleLawSelectChange("initiator")}>
                <option value="">Toți inițiatorii</option>
                {lawOptions.initiators.map((initiator) => (
                  <option key={initiator} value={initiator}>
                    {initiator}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Categorie
              <select value={lawFilters.category} onChange={handleLawSelectChange("category")}>
                <option value="">Toate categoriile</option>
                {lawOptions.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Interval
              <div className="filter-range">
                <input type="date" value={lawFilters.dateFrom} onChange={handleLawDateChange("dateFrom")} />
                <span>-</span>
                <input type="date" value={lawFilters.dateTo} onChange={handleLawDateChange("dateTo")} />
              </div>
            </label>
          </div>
        ) : (
          <div className="filter-body">
            <label>
              Partid
              <select value={mpFilters.party} onChange={handleMpSelectChange("party")}>
                <option value="">Toate partidele</option>
                {mpOptions.parties.map((party) => (
                  <option key={party} value={party}>
                    {party}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Județ
              <select value={mpFilters.county} onChange={handleMpSelectChange("county")}>
                <option value="">Toate județele</option>
                {mpOptions.counties.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cameră
              <select value={mpFilters.chamber} onChange={handleMpSelectChange("chamber")}>
                <option value="">Toate camerele</option>
                {mpOptions.chambers.map((chamber) => (
                  <option key={chamber} value={chamber}>
                    {formatChamber(chamber)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="filter-footer">
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button onClick={onClose}>Aplică</Button>
        </div>
      </div>
    </div>
  );
}
