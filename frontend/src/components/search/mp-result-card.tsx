import { Link } from "@tanstack/react-router";
import type { SearchMP } from "@/lib/api";
import { formatChamber, pluralizeLege } from "@/lib/utils";

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
    ? `Voturi pe ${relatedBills} ${pluralizeLege(relatedBills)} legate de '${keyword}'.`
    : `Nu am găsit voturi directe legate de '${keyword}'.`;
  const voteCounts = [
    { key: "for", label: "Pentru", count: relation?.forVotes ?? 0 },
    { key: "against", label: "Contra", count: relation?.againstVotes ?? 0 },
    { key: "abstain", label: "Abțineri", count: relation?.abstainVotes ?? 0 },
    { key: "absent", label: "Absent", count: relation?.absentVotes ?? 0 },
  ];

  const metaItems = [
    mp.party,
    mp.county,
    formatChamber(mp.chamber)
  ].filter(Boolean);

  return (
    <div className="search-mp-card">
      <div className="search-mp-header">
        <div>
          <div className="search-mp-name">{mp.mp_name}</div>
          <div className="search-mp-meta">
            {metaItems.map((item, idx) => (
              <span key={idx}>
                {idx > 0 && " · "}
                {item}
              </span>
            ))}
          </div>
        </div>
        {relatedBills > 0 && (
          <div className="search-mp-match-count" aria-label={`${relatedBills} ${pluralizeLege(relatedBills)} potrivite`}>
            <strong>{relatedBills}</strong>
            <span>{pluralizeLege(relatedBills)}</span>
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
