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

  if (!votes || !votes.vote_session) {
    return (
      <section 
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Voturi</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Nu există date de vot pentru acest proiect.</div>
      </section>
    );
  }

  const s = votes.vote_session.summary;
  const total = s.present || (s.for + s.against + s.abstain + s.absent);
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  // Fix for bars map
  const voteBars = [
    { label: "Pentru", count: s.for, color: "var(--color-success)" },
    { label: "Contra", count: s.against, color: "var(--color-destructive)" },
    { label: "Abținere", count: s.abstain, color: "var(--text-muted)" },
    { label: "Absent", count: s.absent, color: "var(--color-input)" },
  ];

  return (
    <section 
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <button
        onClick={() => setVotesExpanded(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          outline: "none"
        }}
      >
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Voturi
        </div>
        <ChevronDown
          size={16}
          style={{ 
            color: "var(--text-muted)", 
            transition: "transform 0.2s", 
            transform: votesExpanded ? "rotate(180deg)" : "rotate(0deg)" 
          }}
        />
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {voteBars.map(({ label, count, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "var(--text)", fontWeight: 700 }}>{count} ({pct(count)}%)</span>
            </div>
            <div style={{ borderRadius: "999px", background: "var(--bg)", overflow: "hidden", height: "6px" }}>
              <div
                style={{ height: "100%", borderRadius: "999px", width: `${pct(count)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {votesExpanded && (
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {(["Toți", "Pentru", "Contra", "Abținere", "Absent"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setVoteFilter(tab)}
                style={{
                  fontSize: "11.5px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: "1px solid var(--border)",
                  background: voteFilter === tab ? "var(--primary)" : "var(--surface)",
                  color: voteFilter === tab ? "var(--primary-text)" : "var(--text-muted)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {uniqueParties.length > 1 && (
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "13px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text)",
                marginBottom: "16px",
                outline: "none"
              }}
            >
              <option>Toate Partidele</option>
              {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredMPs.length === 0 ? (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Nicio înregistrare.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filteredMPs.map(mp => (
                  <div
                    key={`${mp.mp_slug}-${mp.bucket}`}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "8px 0", 
                      borderBottom: "1px solid var(--bg)",
                      gap: "12px"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mp.mp_name}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{mp.party}</div>
                    </div>
                    <span style={{ 
                      fontSize: "10px", 
                      fontWeight: 700, 
                      flexShrink: 0, 
                      padding: "2px 8px", 
                      borderRadius: "4px",
                      color: mp.bucket === "Pentru" ? "var(--color-success)" : 
                             mp.bucket === "Contra" ? "var(--color-destructive)" : 
                             "var(--text-muted)",
                      backgroundColor: "var(--bg)"
                    }}>
                      {mp.bucket}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontWeight: 500 }}>
            {filteredMPs.length} / {allVotedMPs.length} voturi
          </div>
        </div>
      )}
    </section>
  );
}
