import React, { useEffect, useMemo, useState, useRef, type CSSProperties, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Bill, type RagSource, type BillVotesResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  FileText,
  MessageSquareText,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

type SourceDocument = {
  label: string;
  url: string;
};

type BillChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const pageStyle: CSSProperties = {
  minHeight: "calc(100vh - 60px)",
  padding: "40px 60px",
};

const containerStyle: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
};

const sectionCardStyle: CSSProperties = {
  ...cardStyle,
  padding: 24,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#aaa",
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "0 0 8px 18px", padding: 0, lineHeight: 1.6 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "0 0 8px 18px", padding: 0, lineHeight: 1.6 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
        h1: ({ children }) => <h1 style={{ margin: "0 0 8px", fontSize: 17, lineHeight: 1.3 }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ margin: "0 0 8px", fontSize: 15.5, lineHeight: 1.35 }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ margin: "0 0 7px", fontSize: 14, lineHeight: 1.35 }}>{children}</h3>,
        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#2457d6", textDecoration: "underline" }}>
            {children}
          </a>
        ),
        hr: () => <hr style={{ border: 0, borderTop: "1px solid #e7e7e2", margin: "10px 0" }} />,
        code: ({ children }) => (
          <code style={{ background: "#f3f3f1", border: "1px solid #e7e7e2", borderRadius: 5, padding: "1px 4px", fontSize: "0.92em" }}>
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

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

  // Votes
  const [votes, setVotes] = useState<BillVotesResponse | null>(null);
  const [votesExpanded, setVotesExpanded] = useState(false);
  const [voteFilter, setVoteFilter] = useState<"Toți" | "Pentru" | "Contra" | "Abținere" | "Absent">("Toți");
  const [partyFilter, setPartyFilter] = useState("Toate Partidele");

  // Q&A
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState<BillChatMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaSources, setQaSources] = useState<RagSource[]>([]);
  const qaBottomRef = useRef<HTMLDivElement>(null);
  const qaAnswerRef = useRef<HTMLDivElement>(null);
  const qaAnswer = [...qaMessages].reverse().find(message => message.role === "assistant")?.content ?? "";

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

  useEffect(() => {
    api.getBillVotes(billId).then(setVotes).catch(() => {});
  }, [billId]);

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

  useEffect(() => {
    qaBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qaMessages, qaSources, qaLoading, qaOpen]);

  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = qaQuestion.trim();
    if (!q || qaLoading) return;
    const userMessage: BillChatMessage = { id: createId(), role: "user", content: q };
    const assistantId = createId();
    let assistantStarted = false;

    setQaOpen(true);
    setQaQuestion("");
    setQaMessages(prev => [...prev, userMessage]);
    setQaSources([]);
    setQaLoading(true);
    try {
      await api.streamRagChat(q, { bill_idp: billId }, {
        onEvent: (event) => {
          if (event.type === "token") {
            if (!assistantStarted) {
              assistantStarted = true;
              setQaMessages(prev => [...prev, { id: assistantId, role: "assistant", content: event.delta }]);
            } else {
              setQaMessages(prev =>
                prev.map(message =>
                  message.id === assistantId
                    ? { ...message, content: message.content + event.delta }
                    : message,
                ),
              );
            }
          }
          if (event.type === "sources") setQaSources(event.items);
          if (event.type === "done") {
            setQaSources(event.sources);
            if (!assistantStarted) {
              assistantStarted = true;
              setQaMessages(prev => [...prev, { id: assistantId, role: "assistant", content: event.answer }]);
            } else if (event.answer) {
              setQaMessages(prev =>
                prev.map(message =>
                  message.id === assistantId ? { ...message, content: event.answer } : message,
                ),
              );
            }
          }
        },
      });
    } catch {
      setQaMessages(prev => [
        ...prev,
        { id: assistantId, role: "assistant", content: "A aparut o eroare. Incearca din nou." },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

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
                width: 60,
                height: 60,
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
    gap: 24,
    gridTemplateColumns: "minmax(0, 1.7fr) 320px",
  };

  return (
    <div style={{ ...pageStyle, background: "#f8f8f7" }}>
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Breadcrumbs items={[{ label: "Feed", href: "/" }, { label: bill.bill_number }]} />
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #e3e3dd",
              fontSize: 13.5,
              fontWeight: 600,
              color: "#111",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <ChevronLeft size={16} />
            Înapoi la feed
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span style={{ ...pillStyle(), background: "#ffffff", border: "1px solid #dddcd4" }}>{bill.bill_number}</span>
              <span style={statusStyle(bill.status)}>{bill.status || "In progres"}</span>
              {bill.procedure ? <span style={pillStyle()}>{bill.procedure}</span> : null}
            </div>

            <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0, 1fr) 300px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h1 style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 600, color: "#111", maxWidth: 720 }}>
                  {title}
                </h1>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#555", maxWidth: 640 }}>
                  {ai?.key_ideas?.[0]
                    ? ai.key_ideas[0]
                    : "Această pagină reunește statusul oficial, rezumatul AI, documentele sursă și indicatorii de impact pentru acest proiect legislativ."}
                </p>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #e8e8e8",
                  background: "#fafafa",
                  padding: 16,
                }}
              >
                <div style={eyebrowStyle}>Notă transparență</div>
                <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: "#666" }}>
                  Rezumatul este generat automat pe baza documentelor oficiale. Consultă sursele de mai jos pentru verificarea detaliilor.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <MetaCard icon={<User size={18} />} label="Inițiator" value={bill.initiator_name || bill.initiator_type || "Necunoscut"} />
              <MetaCard icon={<Calendar size={18} />} label="Înregistrat" value={registeredDate} />
              <MetaCard icon={<FileText size={18} />} label="Tip Lege" value={bill.law_type || "Proiect de lege"} />
              <MetaCard icon={<Scale size={18} />} label="Adoptat" value={adoptedDate || "În analiză"} />
            </div>
          </div>
        </section>

        <div style={layoutStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Section eyebrow="Sinteză AI" title="Ce prevede acest proiect" icon={<Sparkles size={20} />}>
              {ai?.key_ideas?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {ai.key_ideas.map((idea, index) => (
                    <div
                      key={`${index}-${idea}`}
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: "16px 20px",
                        borderRadius: 12,
                        border: "1px solid #e8e8e8",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#ffffff",
                          border: "1px solid #ececec",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>{idea}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: "1px dashed #e0e0e0",
                    background: "#fafafa",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#777",
                  }}
                >
                  Rezumatul AI nu a fost încă generat. Documentele oficiale sunt disponibile în panoul lateral.
                </div>
              )}
            </Section>

            <Section eyebrow="Analiză dezbatere" title="Argumente Pro și Contra" icon={<MessageSquareText size={20} />}>
              <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #d9efe1",
                    background: "#f3fbf4",
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#17663e", marginBottom: 14 }}>
                    <ShieldCheck size={18} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Argumente PRO</h3>
                  </div>
                  {ai?.pro_arguments?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {ai.pro_arguments.map((argument, index) => (
                        <p key={`${index}-${argument}`} style={{ fontSize: 14.5, lineHeight: 1.6, color: "#1c472d" }}>
                          {argument}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "#477458" }}>Nu au fost extrase argumente de susținere.</p>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f1dddd",
                    background: "#fff5f5",
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b73b3b", marginBottom: 14 }}>
                    <ShieldAlert size={18} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Argumente CONTRA</h3>
                  </div>
                  {ai?.con_arguments?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {ai.con_arguments.map((argument, index) => (
                        <p key={`${index}-${argument}`} style={{ fontSize: 14.5, lineHeight: 1.6, color: "#612f2f" }}>
                          {argument}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "#8a5d5d" }}>Nu au fost extrase critici pentru acest proiect.</p>
                  )}
                </div>
              </div>
            </Section>

            <Section eyebrow="Impact vizat" title="Categorii și Grupuri Afectate" icon={<Scale size={20} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <div style={{ ...eyebrowStyle, marginBottom: 12 }}>Domenii de impact</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {ai?.impact_categories?.length ? (
                      ai.impact_categories.map((category) => (
                        <span
                          key={category}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 14px",
                            borderRadius: 999,
                            background: "#1e1e1b",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {category}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 14, color: "#777" }}>Fără categorii de impact identificate.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ ...eyebrowStyle, marginBottom: 12 }}>Profiluri vizate</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {ai?.affected_profiles?.length ? (
                      ai.affected_profiles.map((profile) => (
                        <span
                          key={profile}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 14px",
                            borderRadius: 999,
                            background: "#fafaf8",
                            color: "#3f3f3a",
                            fontSize: 13,
                            fontWeight: 600,
                            border: "1px solid #e4e4de",
                          }}
                        >
                          {profile}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 14, color: "#777" }}>Nu au fost extrase profiluri specifice.</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Right Diff Panel */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Votes */}
            <section style={{ ...sectionCardStyle, position: "sticky", top: 100 }}>
              <button
                onClick={() => setVotesExpanded(v => !v)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: votes ? 16 : 0 }}
              >
                <div style={eyebrowStyle}>Voturi</div>
                <ChevronDown size={16} style={{ color: "#aaa", transform: votesExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
              </button>

              {votes ? (() => {
                const s = votes.vote_session.summary;
                const total = s.present || (s.for + s.against + s.abstain + s.absent);
                const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
                const bars = [
                  { label: "Pentru", count: s.for, color: "#16a34a" },
                  { label: "Contra", count: s.against, color: "#dc2626" },
                  { label: "Abținere", count: s.abstain, color: "#888" },
                  { label: "Absent", count: s.absent, color: "#ccc" },
                ];
                return (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {bars.map(({ label, count, color }) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: "#555", fontWeight: 500 }}>{label}</span>
                            <span style={{ color, fontWeight: 600 }}>{count} ({pct(count)}%)</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
                            <div style={{ width: `${pct(count)}%`, height: "100%", background: color, borderRadius: 99 }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {votesExpanded && (
                      <div style={{ marginTop: 18, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                          {(["Toți", "Pentru", "Contra", "Abținere", "Absent"] as const).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setVoteFilter(tab)}
                              style={{
                                fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                                border: `1px solid ${voteFilter === tab ? "#111" : "#e0e0e0"}`,
                                background: voteFilter === tab ? "#111" : "transparent",
                                color: voteFilter === tab ? "white" : "#666",
                                fontFamily: "var(--font)",
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
                              width: "100%", padding: "7px 10px", fontSize: 13,
                              border: "1px solid #e2e2e2", borderRadius: 8,
                              background: "white", color: "#111", marginBottom: 12,
                              fontFamily: "var(--font)", outline: "none",
                            }}
                          >
                            <option>Toate Partidele</option>
                            {uniqueParties.map(p => <option key={p}>{p}</option>)}
                          </select>
                        )}

                        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                          {filteredMPs.length === 0 ? (
                            <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "16px 0" }}>Nicio înregistrare.</div>
                          ) : filteredMPs.map(mp => (
                            <div
                              key={`${mp.mp_slug}-${mp.bucket}`}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f5f5", gap: 8 }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mp.mp_name}</div>
                                <div style={{ fontSize: 11.5, color: "#aaa" }}>{mp.party}</div>
                              </div>
                              <span style={{
                                fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                                color: mp.bucket === "Pentru" ? "#16a34a" : mp.bucket === "Contra" ? "#dc2626" : "#aaa",
                              }}>
                                {mp.bucket}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: "#bbb", marginTop: 10 }}>
                          {filteredMPs.length} / {allVotedMPs.length} voturi
                        </div>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div style={{ fontSize: 13.5, color: "#aaa", textAlign: "center", padding: "12px 0" }}>
                  Nu există date de vot.
                </div>
              )}
            </section>

            {/* Documents */}
            <section style={sectionCardStyle}>
              <div style={{ ...eyebrowStyle, marginBottom: 16 }}>Surse și referințe</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #e8e8e8",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: "#ffffff",
                            border: "1px solid #ececec",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#1f1f1c",
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#333" }}>{document.label}</span>
                      </div>
                      <ArrowUpRight size={16} color="#7a7a72" />
                    </a>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "16px 14px",
                      borderRadius: 10,
                      border: "1px dashed #e0e0e0",
                      background: "#fafafa",
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      color: "#777",
                    }}
                  >
                    Nu sunt atașate documente oficiale.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
        {!qaOpen && (
          <button
            type="button"
            onClick={() => setQaOpen(true)}
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              zIndex: 60,
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "13px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#111",
              color: "white",
              boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
              cursor: "pointer",
              fontFamily: "var(--font)",
              fontSize: 13.5,
              fontWeight: 700,
            }}
            aria-label="Deschide chatul AI pentru acest proiect"
          >
            <MessageSquareText size={17} />
            Intreaba AI
          </button>
        )}
        {qaOpen && (
          <div
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              width: "min(440px, calc(100vw - 32px))",
              height: "min(620px, calc(100vh - 88px))",
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              background: "white",
              border: "1px solid #dedede",
              borderRadius: 12,
              boxShadow: "0 18px 55px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "13px 14px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#111", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                AI
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111" }}>Chat despre proiect</div>
                <div style={{ fontSize: 11.5, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bill.bill_number}</div>
              </div>
              <button
                type="button"
                onClick={() => setQaOpen(false)}
                style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#f5f5f5", color: "#555", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Inchide chatul"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {qaMessages.length === 0 && (
                <div style={{ border: "1px dashed #dedede", borderRadius: 10, padding: 14, fontSize: 13, color: "#666", lineHeight: 1.55 }}>
                  Intreaba cum te afecteaza proiectul, ce prevede sau ce documente oficiale sustin raspunsul.
                </div>
              )}
              {qaMessages.map(message => (
                <div key={message.id} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                  {message.role === "assistant" && (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                      AI
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "9px 12px",
                      borderRadius: message.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                      background: message.role === "user" ? "#111" : "#fafafa",
                      color: message.role === "user" ? "white" : "#111",
                      border: message.role === "assistant" ? "1px solid #e8e8e8" : "none",
                      fontSize: 13,
                      lineHeight: 1.55,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.role === "assistant" ? <MarkdownContent content={message.content} /> : <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>}
                  </div>
                </div>
              ))}
              {qaLoading && qaMessages[qaMessages.length - 1]?.role !== "assistant" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#aaa", fontSize: 13 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>AI</div>
                  Se genereaza raspunsul...
                </div>
              )}
              {qaSources.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 34 }}>
                  {qaSources.slice(0, 4).map((src, i) => (
                    <div key={`${src.document_id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 7px", borderRadius: 6, background: "#f5f5f5", border: "1px solid #e8e8e8", fontSize: 11, color: "#666", maxWidth: 180, overflow: "hidden" }}>
                      <FileText size={11} style={{ flexShrink: 0, color: "#aaa" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.title || src.document_id}</span>
                    </div>
                  ))}
                </div>
              )}
              <div ref={qaBottomRef} />
            </div>

            <form onSubmit={handleQaSubmit} style={{ padding: 12, borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                type="text"
                value={qaQuestion}
                onChange={e => setQaQuestion(e.target.value)}
                placeholder="Intreaba despre acest proiect..."
                disabled={qaLoading}
                style={{ flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 13, border: "1px solid #e2e2e2", borderRadius: 8, background: "white", color: "#111", outline: "none", fontFamily: "var(--font)" }}
              />
              <button
                type="submit"
                disabled={qaLoading || !qaQuestion.trim()}
                style={{ width: 38, height: 38, borderRadius: 8, border: "none", background: qaLoading || !qaQuestion.trim() ? "#d5d5d5" : "#111", color: "white", cursor: qaLoading || !qaQuestion.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label="Trimite intrebarea"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bills/$id")({
  component: BillDetailPage,
});
