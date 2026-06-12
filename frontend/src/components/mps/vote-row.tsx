import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { MPVote } from "@/lib/api";
import { formatDate, extractBillTitleAndBody } from "@/lib/utils";

const VOTE_COLORS: Record<string, string> = {
  for: "var(--color-success)",
  against: "var(--color-destructive)",
  abstain: "var(--color-muted-foreground)",
  absent: "var(--color-input)",
  Pentru: "var(--color-success)",
  Contra: "var(--color-destructive)",
  Abtinere: "var(--color-muted-foreground)",
  "Abținere": "var(--color-muted-foreground)",
  Absent: "var(--color-input)",
};

const VOTE_LABELS: Record<string, string> = {
  for: "Pentru",
  against: "Contra",
  abstain: "Abținere",
  absent: "Absent",
  Pentru: "Pentru",
  Contra: "Contra",
  Abtinere: "Abținere",
  "Abținere": "Abținere",
  Absent: "Absent",
};

export function VoteRow({ vote }: { vote: MPVote }) {
  const voteColor = VOTE_COLORS[vote.vote] ?? "#aaa";
  const voteLabel = VOTE_LABELS[vote.vote] ?? vote.vote;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 0", borderBottom: "1px solid var(--border)",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
        color: voteColor,
        background: `${voteColor}18`,
        padding: "3px 8px", borderRadius: 5, minWidth: 64, textAlign: "center",
      }}>
        {voteLabel}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.45, marginBottom: 4 }}>
          {extractBillTitleAndBody(vote.title_short || vote.bill_title).title || vote.bill_number}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {vote.vote_date && (
            <span className="muted" style={{ fontSize: 11.5 }}>
              {formatDate(vote.vote_date)}
            </span>
          )}
          {vote.vote_type && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{vote.vote_type}</span>
          )}
          {vote.impact_categories?.slice(0, 2).map(cat => (
            <span key={cat} style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--color-muted)", padding: "1px 7px", borderRadius: 4 }}>
              {cat}
            </span>
          ))}
          {vote.controversy_score != null && vote.controversy_score > 0.6 && (
            <span style={{ fontSize: 11, color: "var(--color-warning)", background: "color-mix(in srgb, var(--color-warning) 12%, white)", padding: "1px 7px", borderRadius: 4 }}>
              controversat
            </span>
          )}
          <Link
            to="/bills/$id"
            params={{ id: String(vote.bill_idp) }}
            className="muted"
            style={{ marginLeft: "auto", fontSize: 11.5, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}
          >
            {vote.bill_number} <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
