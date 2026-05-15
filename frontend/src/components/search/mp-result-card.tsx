import { Link } from "@tanstack/react-router";
import type { SearchMP } from "@/lib/api";
import { formatChamber } from "@/lib/search-filters";

type MpResultCardProps = {
  mp: SearchMP;
  query: string;
};

export function MpResultCard({ mp, query }: MpResultCardProps) {
  const relation = mp.relation;
  const relatedBills = relation?.relatedBills ?? 0;
  const billIds = relation?.billIds ?? [];
  const billNumbers = relation?.billNumbers ?? [];
  const keyword = relation?.keyword || query;
  const relationText = relatedBills > 0
    ? `Voturi pe ${relatedBills} ${relatedBills === 1 ? "lege" : "legi"} legate de '${keyword}'.`
    : `Nu am găsit voturi directe legate de '${keyword}'.`;
  const voteCounts = [
    { key: "for", label: "Pentru", count: relation?.forVotes ?? 0 },
    { key: "against", label: "Contra", count: relation?.againstVotes ?? 0 },
    { key: "abstain", label: "Abțineri", count: relation?.abstainVotes ?? 0 },
    { key: "absent", label: "Absent", count: relation?.absentVotes ?? 0 },
  ];

  return (
    <div className="search-mp-card">
      <div className="search-mp-header">
        <div>
          <div className="search-mp-name">{mp.mp_name}</div>
          <div className="search-mp-meta">
            {mp.party && <span>{mp.party}</span>}
            {mp.county && <span>· {mp.county}</span>}
            {mp.chamber && <span>· {formatChamber(mp.chamber)}</span>}
          </div>
        </div>
        {relatedBills > 0 && (
          <div className="search-mp-match-count" aria-label={`${relatedBills} legi potrivite`}>
            <strong>{relatedBills}</strong>
            <span>{relatedBills === 1 ? "lege" : "legi"}</span>
          </div>
        )}
      </div>
      <div className="search-mp-relation">{relationText}</div>
      {relatedBills > 0 && (
        <div className="search-mp-vote-counts" aria-label={`Voturi legate de ${keyword}`}>
          {voteCounts.map((item) => (
            <span key={item.key} className={`search-mp-vote-count ${item.key}`}>
              <strong>{item.count}</strong> {item.label}
            </span>
          ))}
        </div>
      )}
      <Link
        to="/mps/$slug"
        params={{ slug: mp.mp_slug }}
        search={
          billNumbers.length > 0
            ? { q: keyword, billNumbers: billNumbers.join(",") }
            : billIds.length > 0
              ? { q: keyword, billIds: billIds.join(",") }
              : {}
        }
        className="search-mp-link"
      >
        Vezi profil complet
      </Link>
    </div>
  );
}
