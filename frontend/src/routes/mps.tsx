import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

const PARTIES = ["Toate", "PSD", "PNL", "USR", "AUR", "UDMR"];

const MPS_DATA = [
  {
    rank: 1,
    name: "Alexandru Popescu",
    party: "PSD",
    score: 94.5,
    participation: 98,
    decisiveness: 92,
    narrative: "Participare consistentă la voturile parlamentare, cu poziții clare pe reforme economice și de justiție. Absent la doar 2 din ultimele 100 de voturi.",
    votes: [
      { bill: "PL-x 91/2025", vote: "for" as const },
      { bill: "PL-x 84/2025", vote: "for" as const },
      { bill: "PL-x 78/2025", vote: "against" as const },
      { bill: "PL-x 72/2025", vote: "for" as const },
      { bill: "PL-x 65/2025", vote: "abstain" as const },
    ],
  },
  {
    rank: 2,
    name: "Maria Ionescu",
    party: "PNL",
    score: 88.2,
    participation: 95,
    decisiveness: 84,
    narrative: "Prezență solidă la voturile de plen, cu preferință pentru proiecte de infrastructură și educație.",
    votes: [
      { bill: "PL-x 91/2025", vote: "for" as const },
      { bill: "PL-x 84/2025", vote: "against" as const },
      { bill: "PL-x 78/2025", vote: "for" as const },
      { bill: "PL-x 72/2025", vote: "for" as const },
      { bill: "PL-x 65/2025", vote: "for" as const },
    ],
  },
  {
    rank: 3,
    name: "Ion Popa",
    party: "USR",
    score: 85.7,
    participation: 92,
    decisiveness: 81,
    narrative: "Participare ridicată cu vot consecvent pe linia partidului. Abțineri strategice pe proiecte controversate.",
    votes: [
      { bill: "PL-x 91/2025", vote: "against" as const },
      { bill: "PL-x 84/2025", vote: "against" as const },
      { bill: "PL-x 78/2025", vote: "for" as const },
      { bill: "PL-x 72/2025", vote: "abstain" as const },
      { bill: "PL-x 65/2025", vote: "against" as const },
    ],
  },
  {
    rank: 4,
    name: "Elena Radu",
    party: "USR",
    score: 83.1,
    participation: 89,
    decisiveness: 79,
    narrative: "Susținătoare consecventă a digitalizării și guvernanței civice. Absentă rar, cu abțineri pe subiecte controversate.",
    votes: [
      { bill: "PL-x 91/2025", vote: "for" as const },
      { bill: "PL-x 84/2025", vote: "for" as const },
      { bill: "PL-x 78/2025", vote: "abstain" as const },
      { bill: "PL-x 72/2025", vote: "for" as const },
      { bill: "PL-x 65/2025", vote: "for" as const },
    ],
  },
];

const VOTE_LABEL: Record<"for" | "against" | "abstain", string> = {
  for: "Pentru",
  against: "Împotrivă",
  abstain: "Abținere",
};

const VOTE_COLOR: Record<"for" | "against" | "abstain", string> = {
  for: "#16a34a",
  against: "#dc2626",
  abstain: "#888",
};

function MPsPage() {
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("Toate");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = MPS_DATA.filter((mp) => {
    const matchSearch = mp.name.toLowerCase().includes(search.toLowerCase());
    const matchParty = party === "Toate" || mp.party === party;
    return matchSearch && matchParty;
  });

  const avgParticipation = Math.round(MPS_DATA.reduce((s, m) => s + m.participation, 0) / MPS_DATA.length);
  const avgDecisiveness = Math.round(MPS_DATA.reduce((s, m) => s + m.decisiveness, 0) / MPS_DATA.length);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 }}>MP Scoreboard</h1>
        <p style={{ fontSize: 13, color: "#888" }}>
          Urmărește parlamentarii pe baza scorului de impact și participării la voturi decisive.
        </p>
      </div>

      {/* Search + party filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
          <input
            type="text"
            placeholder="Caută după nume..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 30px",
              fontSize: 13,
              border: "1px solid #e2e2e2",
              borderRadius: 8,
              background: "white",
              color: "#111",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PARTIES.map((p) => (
            <button
              key={p}
              onClick={() => setParty(p)}
              style={{
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: party === p ? 600 : 400,
                borderRadius: 6,
                border: "1px solid " + (party === p ? "#111" : "#e2e2e2"),
                background: party === p ? "#111" : "white",
                color: party === p ? "white" : "#555",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats card */}
      <div
        style={{
          background: "#111",
          color: "white",
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 16,
          display: "flex",
          gap: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{avgParticipation}%</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Participare Medie</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{avgDecisiveness}%</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Decizie Medie</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 260, lineHeight: 1.5 }}>
          Scorul combină rata de participare (60%) și gradul de decizie (40%) pentru fiecare parlamentar.
        </div>
      </div>

      {/* MP list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((mp) => {
          const isExpanded = expanded === mp.rank;
          return (
            <div
              key={mp.rank}
              style={{
                background: "white",
                border: "1px solid #e8e8e8",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Row */}
              <div
                onClick={() => setExpanded(isExpanded ? null : mp.rank)}
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white"; }}
              >
                {/* Rank badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#111",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  #{mp.rank}
                </div>

                {/* Name + stats */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#111" }}>{mp.name}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "#f0f0f0",
                        color: "#555",
                      }}
                    >
                      {mp.party}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    Participare: {mp.participation}% &nbsp;•&nbsp; Decizie: {mp.decisiveness}%
                  </div>
                </div>

                {/* Score + bar */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 }}>{mp.score}</div>
                  <div style={{ width: 100, height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${mp.score}%`, height: "100%", background: "#111", borderRadius: 99 }} />
                  </div>
                </div>

                {/* Chevron */}
                <div style={{ color: "#ccc", flexShrink: 0 }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa", padding: "14px 16px" }}>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>{mp.narrative}</p>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Voturi Recente
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {mp.votes.map((v, i) => (
                      <div
                        key={i}
                        style={{
                          background: "white",
                          border: "1px solid #e8e8e8",
                          borderRadius: 7,
                          padding: "6px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          minWidth: 130,
                        }}
                      >
                        <span style={{ fontSize: 11.5, color: "#555", fontWeight: 500 }}>{v.bill}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: VOTE_COLOR[v.vote] }}>
                          {VOTE_LABEL[v.vote]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 13 }}>
            Nu s-au găsit parlamentari.
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/mps")({
  component: MPsPage,
});
