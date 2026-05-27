import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BillVotesResponse } from "@/lib/api";

interface BillVotesProps {
  votes: BillVotesResponse | null;
}

export function BillVotes({ votes }: BillVotesProps) {
  const [votesExpanded, setVotesExpanded] = useState(false);
  const [voteFilter, setVoteFilter] = useState<"Toți" | "Pentru" | "Contra" | "Abținere" | "Absent">("Toți");
  const [partyFilter, setPartyFilter] = useState("Toate Partidele");

  const allVotedMPs = useMemo(() => {
    if (!votes) return [];
    return [
      ...votes.votes.for.map(v => ({ ...v, bucket: "Pentru" as const })),
      ...votes.votes.against.map(v => ({ ...v, bucket: "Contra" as const })),
      ...votes.votes.abstain.map(v => ({ ...v, bucket: "Abținere" as const })),
      ...votes.votes.absent.map(v => ({ ...v, bucket: "Absent" as const })),
    ];
  }, [votes]);

  const uniqueParties = useMemo(
    () => [...new Set(allVotedMPs.map(v => v.party))].sort(),
    [allVotedMPs],
  );

  const filteredMPs = useMemo(
    () => allVotedMPs.filter(mp => {
      const matchVote = voteFilter === "Toți" || mp.bucket === voteFilter;
      const matchParty = partyFilter === "Toate Partidele" || mp.party === partyFilter;
      return matchVote && matchParty;
    }),
    [allVotedMPs, voteFilter, partyFilter],
  );

  if (!votes) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 mb-4">Voturi</div>
        <div className="text-sm text-gray-400 text-center py-3">Nu există date de vot.</div>
      </section>
    );
  }

  const s = votes.vote_session.summary;
  const total = s.present || (s.for + s.against + s.abstain + s.absent);
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  const bars = [
    { label: "Pentru", count: s.for, color: "var(--color-success)" },
    { label: "Contra", count: s.against, color: "var(--color-destructive)" },
    { label: "Abținere", count: s.abstain, color: "var(--color-muted-foreground)" },
    { label: "Absent", count: s.absent, color: "var(--color-input)" },
  ];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <button
        onClick={() => setVotesExpanded(v => !v)}
        className="flex items-center justify-between w-full bg-none border-none cursor-pointer p-0 mb-4 group"
      >
        <div className="text-[10.5px] font-bold tracking-wider uppercase text-gray-400 group-hover:text-gray-600 transition-colors">
          Voturi
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-300 transition-transform duration-200 ${votesExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div className="flex flex-col gap-3">
        {bars.map(({ label, count, color }) => (
          <div key={label}>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span className="text-gray-600 font-medium">{label}</span>
              <span className="text-gray-900 font-bold">{count} ({pct(count)}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct(count)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {votesExpanded && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex gap-2 flex-wrap mb-4">
            {(["Toți", "Pentru", "Contra", "Abținere", "Absent"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setVoteFilter(tab)}
                className={`text-[11.5px] px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  voteFilter === tab
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {uniqueParties.length > 1 && (
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="w-full p-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option>Toate Partidele</option>
              {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredMPs.length === 0 ? (
              <div className="text-[13px] text-gray-400 text-center py-4">Nicio înregistrare.</div>
            ) : (
              <div className="flex flex-col">
                {filteredMPs.map(mp => (
                  <div
                    key={`${mp.mp_slug}-${mp.bucket}`}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{mp.mp_name}</div>
                      <div className="text-[11.5px] text-gray-400">{mp.party}</div>
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-sm ${
                      mp.bucket === "Pentru" ? "text-green-600 bg-green-50" :
                      mp.bucket === "Contra" ? "text-red-600 bg-red-50" :
                      "text-gray-400 bg-gray-50"
                    }`}>
                      {mp.bucket}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-300 mt-3 font-medium">
            {filteredMPs.length} / {allVotedMPs.length} voturi
          </div>
        </div>
      )}
    </section>
  );
}
     )}
    </section>
  );
}
