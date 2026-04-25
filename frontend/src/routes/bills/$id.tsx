import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { Bill } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  FileText,
  MessageSquareText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

type SourceDocument = {
  label: string;
  url: string;
};

const pageStyle: CSSProperties = {
  minHeight: "calc(100vh - 52px)",
  padding: "28px 24px",
};

const containerStyle: CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 10,
};

const sectionCardStyle: CSSProperties = {
  ...cardStyle,
  padding: 18,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#aaa",
};

function statusStyle(status?: string | null): CSSProperties {
  const adopted = status?.toLowerCase().includes("adopt");
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: adopted ? "#dcfce7" : "#f0f0f0",
    color: adopted ? "#16a34a" : "#666",
  };
}

function pillStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: "#f5f5f5",
    color: "#555",
  };
}

function BillDetailSkeleton() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Skeleton className="h-5 w-40" />
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-2/3" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.7fr) 280px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Skeleton className="h-64 w-full rounded-[18px]" />
            <Skeleton className="h-72 w-full rounded-[18px]" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Skeleton className="h-72 w-full rounded-[18px]" />
            <Skeleton className="h-56 w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={sectionCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {eyebrow ? <div style={eyebrowStyle}>{eyebrow}</div> : null}
          <h2 style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, color: "#111" }}>{title}</h2>
        </div>
        {icon ? (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#151515",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "#fff",
        border: "1px solid #e8e8e8",
      }}
    >
      <div style={{ marginTop: 1, color: "#7d7d76", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...eyebrowStyle, fontSize: 9, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, noBorder = false }: { label: string; value: string; noBorder?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        paddingBottom: noBorder ? 0 : 12,
        borderBottom: noBorder ? "none" : "1px solid #efefe9",
      }}
    >
      <span style={{ color: "#888", fontSize: 12.5 }}>{label}</span>
      <span style={{ color: "#111", fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function BillDetailPage() {
  const { id } = useParams({ from: "/bills/$id" });
  const navigate = useNavigate();
  const { isLoading: isAuthLoading } = useAuth();
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const billId = Number.parseInt(id, 10);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getBill(billId);
        if (active) {
          setBill(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load bill details");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [billId]);

  const sourceDocuments = useMemo(() => {
    if (!bill) {
      return [] as SourceDocument[];
    }

    return [
      bill.doc_expunere_url ? { label: "Expunere de motive", url: bill.doc_expunere_url } : null,
      bill.doc_forma_url ? { label: "Forma propusa", url: bill.doc_forma_url } : null,
      bill.doc_aviz_ces_url ? { label: "Aviz CES", url: bill.doc_aviz_ces_url } : null,
      bill.doc_aviz_cl_url ? { label: "Aviz Consiliul Legislativ", url: bill.doc_aviz_cl_url } : null,
      bill.doc_adoptata_url ? { label: "Forma adoptata", url: bill.doc_adoptata_url } : null,
      bill.source_url ? { label: "Pagina oficiala", url: bill.source_url } : null,
    ].filter((doc): doc is SourceDocument => Boolean(doc));
  }, [bill]);

  if (isAuthLoading || isLoading) {
    return <BillDetailSkeleton />;
  }

  if (!bill) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ ...cardStyle, padding: 28, maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                margin: "0 auto 18px",
                borderRadius: "50%",
                background: "#f4f4f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6f6f68",
              }}
            >
              <FileText size={22} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#151515" }}>Bill not found</h1>
            <p style={{ marginTop: 10, color: "#666660", fontSize: 14, lineHeight: 1.65 }}>
              {error || "This legislative record is missing or the route is pointing to the wrong bill."}
            </p>
            <Button onClick={() => navigate({ to: "/" })} className="mt-6 bg-[#151515] hover:bg-[#222]">
              Back to feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const ai = bill.ai_analysis;
  const title = ai?.title_short || bill.title;
  const registeredDate = bill.registered_at ? new Date(bill.registered_at).toLocaleDateString("ro-RO") : "Unknown";
  const adoptedDate = bill.adopted_at ? new Date(bill.adopted_at).toLocaleDateString("ro-RO") : null;
  const layoutStyle: CSSProperties = {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(0, 1.7fr) 280px",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Breadcrumbs items={[{ label: "Feed", href: "/" }, { label: bill.bill_number }]} />
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #e3e3dd",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#111",
            }}
          >
            <ChevronLeft size={14} />
            Back to feed
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...pillStyle(), background: "#ffffff", border: "1px solid #dddcd4" }}>{bill.bill_number}</span>
              <span style={statusStyle(bill.status)}>{bill.status || "In progres"}</span>
              {bill.procedure ? <span style={pillStyle()}>{bill.procedure}</span> : null}
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) 260px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h1 style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 600, color: "#111", maxWidth: 620 }}>
                  {title}
                </h1>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "#666", maxWidth: 560 }}>
                  {ai?.key_ideas?.[0]
                    ? ai.key_ideas[0]
                    : "This page gathers the official status, AI summary, source documents, and impact tags for this legislative initiative."}
                </p>
              </div>

              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid #e8e8e8",
                  background: "#fafafa",
                  padding: 12,
                }}
              >
                <div style={eyebrowStyle}>Transparency note</div>
                <p style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: "#666" }}>
                  Every summary here should map back to the underlying bill record and official source documents. This page is meant to help someone verify, not just skim.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <MetaCard icon={<User size={15} />} label="Initiator" value={bill.initiator_name || bill.initiator_type || "Unknown"} />
              <MetaCard icon={<Calendar size={15} />} label="Registered" value={registeredDate} />
              <MetaCard icon={<FileText size={15} />} label="Law type" value={bill.law_type || "Proiect de lege"} />
              <MetaCard icon={<Scale size={15} />} label="Adopted" value={adoptedDate || "Pending"} />
            </div>
          </div>
        </section>

        <div style={layoutStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Section eyebrow="AI synthesis" title="What this bill is trying to do" icon={<Sparkles size={17} />}>
              {ai?.key_ideas?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ai.key_ideas.map((idea, index) => (
                    <div
                      key={`${index}-${idea}`}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid #e8e8e8",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "#ffffff",
                          border: "1px solid #ececec",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#333" }}>{idea}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: "1px dashed #e0e0e0",
                    background: "#fafafa",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#777",
                  }}
                >
                  The AI summary has not been generated yet. The official documents are still available in the source panel.
                </div>
              )}
            </Section>

            <Section eyebrow="Debate surface" title="Arguments for and against" icon={<MessageSquareText size={17} />}>
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid #d9efe1",
                    background: "#f3fbf4",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#17663e", marginBottom: 10 }}>
                    <ShieldCheck size={15} />
                    <h3 style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Arguments pro</h3>
                  </div>
                  {ai?.pro_arguments?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ai.pro_arguments.map((argument, index) => (
                        <p key={`${index}-${argument}`} style={{ fontSize: 13, lineHeight: 1.55, color: "#1c472d" }}>
                          {argument}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: "#477458" }}>No supporting argument set has been extracted yet.</p>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid #f1dddd",
                    background: "#fff5f5",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#b73b3b", marginBottom: 10 }}>
                    <ShieldAlert size={15} />
                    <h3 style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Arguments contra</h3>
                  </div>
                  {ai?.con_arguments?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ai.con_arguments.map((argument, index) => (
                        <p key={`${index}-${argument}`} style={{ fontSize: 13, lineHeight: 1.55, color: "#612f2f" }}>
                          {argument}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: "#8a5d5d" }}>No criticism set has been extracted yet.</p>
                  )}
                </div>
              </div>
            </Section>

            <Section eyebrow="Why it matters" title="Impact tags and affected groups" icon={<Scale size={17} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Policy areas</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ai?.impact_categories?.length ? (
                      ai.impact_categories.map((category) => (
                        <span
                          key={category}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "7px 10px",
                            borderRadius: 999,
                            background: "#1e1e1b",
                            color: "#ffffff",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {category}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: "#777" }}>No impact categories yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Affected profiles</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ai?.affected_profiles?.length ? (
                      ai.affected_profiles.map((profile) => (
                        <span
                          key={profile}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "7px 10px",
                            borderRadius: 999,
                            background: "#fafaf8",
                            color: "#3f3f3a",
                            fontSize: 11,
                            fontWeight: 600,
                            border: "1px solid #e4e4de",
                          }}
                        >
                          {profile}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: "#777" }}>No profile targeting extracted yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Vote Prediction */}
            <section style={sectionCardStyle}>
              <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Predicție Vot</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Pentru", pct: 55, color: "#16a34a", bg: "#dcfce7" },
                  { label: "Împotrivă", pct: 30, color: "#dc2626", bg: "#fee2e2" },
                  { label: "Abținere", pct: 15, color: "#888", bg: "#f0f0f0" },
                ].map(({ label, pct, color, bg }) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ color: "#555", fontWeight: 500 }}>{label}</span>
                      <span style={{ color, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 12, lineHeight: 1.5 }}>
                Bazat pe alinierea partidelor și declarațiile publice.
              </p>
            </section>

            {/* Documents */}
            <Section eyebrow="Documente oficiale" title="Surse și referințe" icon={<ArrowUpRight size={17} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sourceDocuments.length ? (
                  sourceDocuments.map((document) => (
                    <a
                      key={`${document.label}-${document.url}`}
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "9px 10px",
                        borderRadius: 8,
                        border: "1px solid #e8e8e8",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: "#ffffff",
                            border: "1px solid #ececec",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#1f1f1c",
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={14} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#333" }}>{document.label}</span>
                      </div>
                      <ArrowUpRight size={14} color="#7a7a72" />
                    </a>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "14px 12px",
                      borderRadius: 8,
                      border: "1px dashed #e0e0e0",
                      background: "#fafafa",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "#777",
                    }}
                  >
                    Nu sunt atașate documente oficiale pentru acest proiect.
                  </div>
                )}
              </div>
            </Section>

            {/* Civic Q&A */}
            <section style={{ ...sectionCardStyle, background: "#f8f8f8" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ ...eyebrowStyle }}>Civic Q&A</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#555" }}>
                  Ai întrebări despre cum afectează acest proiect municipalitatea ta? Întreabă asistentul AI.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Pune o întrebare..."
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: 12.5,
                      border: "1px solid #e2e2e2",
                      borderRadius: 8,
                      background: "white",
                      color: "#111",
                      outline: "none",
                      fontFamily: "var(--font)",
                    }}
                  />
                  {bill.source_url && (
                    <a
                      href={bill.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#111",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bills/$id")({
  component: BillDetailPage,
});
