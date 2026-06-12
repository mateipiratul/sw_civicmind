import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { Bill, Parliamentarian, User } from "@/lib/api";
import { MPSidebarCard } from "./mp-sidebar-card";
import { extractBillTitleAndBody } from "@/lib/utils";

interface RightSidebarProps {
  isAuthenticated: boolean;
  user: User | null;
  localMPs: Parliamentarian[];
  trendingBills: Bill[];
}

export function RightSidebar({ isAuthenticated, user, localMPs, trendingBills }: RightSidebarProps) {
  return (
    <aside style={{ 
      width: 220, flexShrink: 0, position: "sticky", top: 60, alignSelf: "flex-start", 
      height: "calc(100vh - 60px)", overflowY: "auto", borderLeft: "1px solid var(--border)", 
      background: "color-mix(in srgb, var(--surface) 75%, transparent)", padding: "20px 16px", display: "flex", flexDirection: "column" 
    }}>
      {localMPs.length > 0 ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Parlamentarii Tăi
            </span>
            {user?.county && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{user.county}</div>
            )}
          </div>
          {localMPs.map((mp) => (
            <MPSidebarCard key={mp.mp_slug} mp={mp} />
          ))}
          <Link
            to="/mps"
            className="muted"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 4, color: "var(--text-muted)" }}
          >
            Toți parlamentarii <ChevronRight size={12} />
          </Link>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              În Tendințe
            </span>
          </div>
          {trendingBills.slice(0, 4).map((bill, i) => (
            <Link key={bill.idp} to="/bills/$id" params={{ id: String(bill.idp) }} style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Acum {i + 1} zi{i === 0 ? "" : "le"}</div>
              <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.4, fontWeight: 500 }}>
                  {(() => {
                    const raw = bill.ai_analysis?.title_short || bill.title;
                    const { title } = extractBillTitleAndBody(raw);
                    return title.length > 64 ? title.substring(0, 64) + "…" : title;
                  })()}
                </div>
              </div>
            </Link>
          ))}
        </>
      )}

      {!isAuthenticated && (
        <div style={{
          position: "sticky", bottom: 16, marginTop: "auto",
          background: "var(--surface)", borderRadius: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
          padding: "12px 14px",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, display: "block" }}>
            <Link to="/auth/login" style={{ color: "var(--text)", fontWeight: 700 }}>Autentifică-te</Link>
            {" "}ca să urmărești ce contează pentru tine și să rămâi la curent cu schimbările legislative.
          </span>
        </div>
      )}
    </aside>
  );
}
