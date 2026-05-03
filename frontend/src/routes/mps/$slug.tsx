import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { api, type ParliamentarianDetail, type MPVote } from "@/lib/api";

export const Route = createFileRoute("/mps/$slug")({
  component: MPDetailPage,
});

const VOTE_COLORS: Record<string, string> = {
  Pentru: "#16a34a",
  Contra: "#dc2626",
  Abtinere: "#888",
  Absent: "#bbb",
};

function scoreColor(score?: number | null) {
  if (score == null) return "#aaa";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

function VoteRow({ vote, index }: { vote: MPVote; index: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 0", borderBottom: "1px solid #f0f0f0",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
        color: VOTE_COLORS[vote.vote] ?? "#aaa",
        background: `${VOTE_COLORS[vote.vote] ?? "#aaa"}18`,
        padding: "3px 8px", borderRadius: 5, minWidth: 64, textAlign: "center",
      }}>
        {vote.vote}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "#111", lineHeight: 1.4, marginBottom: 4 }}>
          {vote.title_short || vote.bill_title}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {vote.vote_date && (
            <span style={{ fontSize: 11.5, color: "#aaa" }}>
              {new Date(vote.vote_date).toLocaleDateString("ro-RO")}
            </span>
          )}
          {vote.vote_type && (
            <span style={{ fontSize: 11, color: "#bbb" }}>{vote.vote_type}</span>
          )}
          {vote.impact_categories?.slice(0, 2).map(cat => (
            <span key={cat} style={{ fontSize: 11, color: "#666", background: "#f0f0f0", padding: "1px 7px", borderRadius: 4 }}>
              {cat}
            </span>
          ))}
          {vote.controversy_score != null && vote.controversy_score > 0.6 && (
            <span style={{ fontSize: 11, color: "#d97706", background: "#fef3c7", padding: "1px 7px", borderRadius: 4 }}>
              controversat
            </span>
          )}
          <Link
            to="/bills/$id"
            params={{ id: String(vote.bill_idp) }}
            style={{ marginLeft: "auto", fontSize: 11.5, color: "#888", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}
          >
            {vote.bill_number} <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MPDetailPage() {
  const { slug } = Route.useParams();
  const [mp, setMp] = useState<ParliamentarianDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getMPDetail(slug)
      .then(setMp)
      .catch(err => setError(err instanceof Error ? err.message : "Eroare la încărcare"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ height: 16, width: 120, background: "#f0f0f0", borderRadius: 4, marginBottom: 24 }} />
      <div style={{ height: 28, width: "40%", background: "#f0f0f0", borderRadius: 4, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[60, 80, 90].map(w => <div key={w} style={{ height: 22, width: w, background: "#f5f5f5", borderRadius: 4 }} />)}
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 99, marginBottom: 20 }} />
      <div style={{ height: 48, background: "#f8f8f8", borderRadius: 8 }} />
    </div>
  );

  if (error || !mp) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <Link to="/mps" style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
        <ChevronLeft size={14} /> Parlamentari
      </Link>
      <p style={{ color: "#dc2626", fontSize: 13 }}>{error || "Parlamentarul nu a fost găsit."}</p>
    </div>
  );

  const s = mp.impact_score;
  const total = s?.total_votes ?? 0;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back */}
      <Link to="/mps" style={{ fontSize: 13, color: "#888", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24, textDecoration: "none" }}>
        <ChevronLeft size={14} /> Toți parlamentarii
      </Link>

      {/* Profile header */}
      <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 10 }}>{mp.mp_name}</h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {mp.party && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "#f0f0f0", color: "#444" }}>{mp.party}</span>
              )}
              {mp.county && (
                <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 5, background: "#f5f5f5", color: "#666" }}>{mp.county}</span>
              )}
              <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 5, background: "#f5f5f5", color: "#888" }}>
                {mp.chamber === "deputies" ? "Camera Deputaților" : mp.chamber === "senate" ? "Senat" : mp.chamber}
              </span>
              {mp.email && (
                <a href={`mailto:${mp.email}`} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: "#f0f8ff", color: "#2457d6", textDecoration: "none" }}>
                  {mp.email}
                </a>
              )}
            </div>
          </div>
          {s?.score != null && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(s.score), lineHeight: 1 }}>
                {s.score.toFixed(0)}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>scor impact</div>
            </div>
          )}
        </div>

        {/* Vote bar */}
        {total > 0 && (
          <div style={{ marginBottom: s?.narrative ? 16 : 0 }}>
            <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 1, marginBottom: 8 }}>
              <div style={{ width: `${pct(s!.for_count)}%`, background: "#16a34a" }} />
              <div style={{ width: `${pct(s!.against_count)}%`, background: "#dc2626" }} />
              <div style={{ width: `${pct(s!.abstain_count)}%`, background: "#888" }} />
              <div style={{ width: `${pct(s!.absent_count)}%`, background: "#ddd" }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Pentru", n: s!.for_count, color: "#16a34a" },
                { label: "Contra", n: s!.against_count, color: "#dc2626" },
                { label: "Abținere", n: s!.abstain_count, color: "#888" },
                { label: "Absent", n: s!.absent_count, color: "#bbb" },
              ].map(({ label, n, color }) => (
                <span key={label} style={{ fontSize: 12.5 }}>
                  <span style={{ color, fontWeight: 700 }}>{pct(n)}%</span>
                  <span style={{ color: "#888", marginLeft: 4 }}>{label} ({n})</span>
                </span>
              ))}
              <span style={{ fontSize: 12, color: "#bbb", marginLeft: "auto" }}>{total} voturi total</span>
            </div>
          </div>
        )}

        {s?.narrative && (
          <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, margin: 0, paddingTop: total > 0 ? 0 : 4 }}>
            {s.narrative}
          </p>
        )}
      </div>

      {/* Vote history */}
      <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Istoric Voturi</h2>
          <span style={{ fontSize: 12, color: "#aaa" }}>ultimele {mp.recent_votes?.length ?? 0} voturi</span>
        </div>

        {mp.recent_votes?.length > 0 ? (
          mp.recent_votes.map((v, i) => <VoteRow key={i} vote={v} index={i} />)
        ) : (
          <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "24px 0" }}>
            Nu există voturi înregistrate.
          </p>
        )}
      </div>
    </div>
  );
}
