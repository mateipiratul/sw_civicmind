import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ApiError, api, type RagSource } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Fragment {
  id: string;
  label: string;
  law: string;
  excerpt: string;
  href?: string;
  similarity?: string;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Salut. Pot să te ajut să găsești texte similare, să compari acte și să verifici rapid fragmente relevante din sursele legislative oficiale.",
};

const SUGGESTIONS = [
  "Găsește acte similare despre achiziții publice și explică ce au în comun.",
  "Compară texte despre concedii medicale și arată diferențele importante.",
  "Ce acte din 2025 despre sănătate și asigurări sociale sunt cele mai apropiate?",
  "Caută texte similare despre PFA și obligații fiscale.",
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatSimilarity = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}% potrivire` : undefined;

const toFragment = (source: RagSource, index: number): Fragment => ({
  id: source.chunk_id || `${source.document_id}-${index}`,
  label: `Sursa ${index + 1}`,
  law: source.title || source.document_id || "Document legislativ",
  excerpt:
    (source.content || "").slice(0, 340).trim() +
      ((source.content || "").length > 340 ? "..." : "") ||
    "Fragment indisponibil.",
  href: source.source_url || undefined,
  similarity: formatSimilarity(source.score ?? source.similarity ?? null),
});

function buildErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return `Conversația nu a reușit: ${error.message}`;
  }
  if (error instanceof Error && error.message) {
    return `Conversația nu a reușit: ${error.message}`;
  }
  return "Conversația nu a reușit. Verifică dacă serviciul AI rulează pe portul configurat și încearcă din nou.";
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p style={{ margin: "0 0 10px", lineHeight: 1.62 }}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul style={{ margin: "0 0 10px 18px", padding: 0, lineHeight: 1.62 }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: "0 0 10px 18px", padding: 0, lineHeight: 1.62 }}>{children}</ol>
        ),
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        h1: ({ children }) => (
          <h1 style={{ margin: "0 0 10px", fontSize: 20, lineHeight: 1.3 }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ margin: "0 0 10px", fontSize: 17, lineHeight: 1.35 }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.35 }}>{children}</h3>
        ),
        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
        em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
        code: ({ children }) => (
          <code
            style={{
              background: "#f3f3f1",
              border: "1px solid #e7e7e2",
              borderRadius: 6,
              padding: "1px 5px",
              fontSize: "0.92em",
            }}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre
            style={{
              background: "#f7f7f4",
              border: "1px solid #e7e7e2",
              borderRadius: 10,
              padding: "10px 12px",
              overflowX: "auto",
              margin: "0 0 10px",
              lineHeight: 1.55,
            }}
          >
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2457d6", textDecoration: "underline" }}
          >
            {children}
          </a>
        ),
        hr: () => <hr style={{ border: 0, borderTop: "1px solid #e7e7e2", margin: "12px 0" }} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [resolvedSource, setResolvedSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, fragments, isLoading]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const userMessage: Message = { id: createId(), role: "user", content: text };
    const assistantId = createId();
    let assistantStarted = false;
    let streamedText = "";

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setFragments([]);
    setResolvedSource(null);

    try {
      const result = await api.streamRagChat(
        text,
        {},
        {
          onEvent: (event) => {
            if (event.type === "start") {
              setResolvedSource(event.resolved_source ?? null);
              return;
            }

            if (event.type === "sources") {
              setFragments(event.items.map(toFragment));
              return;
            }

            if (event.type === "token") {
              streamedText += event.delta;
              if (!assistantStarted) {
                assistantStarted = true;
                setMessages((prev) => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: event.delta },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + event.delta }
                      : message,
                  ),
                );
              }
              return;
            }

            if (event.type === "done") {
              setResolvedSource(event.resolved_source ?? null);
              setFragments(event.sources.map(toFragment));
              if (!assistantStarted) {
                assistantStarted = true;
                streamedText = event.answer;
                setMessages((prev) => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: event.answer },
                ]);
              } else if (event.answer && event.answer !== streamedText) {
                streamedText = event.answer;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId ? { ...message, content: event.answer } : message,
                  ),
                );
              }
            }
          },
        },
      );

      if (!assistantStarted) {
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: result.answer },
        ]);
      }

      setFragments(result.sources.map(toFragment));
      setResolvedSource(result.resolved_source ?? null);
    } catch (error) {
      const errorMessage = buildErrorMessage(error);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: errorMessage },
      ]);
      setFragments([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        position: "fixed",
        top: 52,
        right: 0,
        bottom: 0,
        left: 0,
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
          borderRight: "1px solid #e8e8e8",
          background: "transparent",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e8e8e8",
            background: "white",
            flexShrink: 0,
          }}
        >
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>Chat legislativ</h1>
          <p style={{ fontSize: 12, color: "#7d7d7d", marginTop: 2 }}>
            Răspunsuri cu streaming și surse din corpusul legislativ indexat.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
              }}
            >
              {message.role === "assistant" && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#111",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  AI
                </div>
              )}
              <div
                style={{
                  maxWidth: "74%",
                  padding: "10px 14px",
                  borderRadius: message.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: message.role === "user" ? "#111" : "white",
                  color: message.role === "user" ? "white" : "#111",
                  fontSize: 13.5,
                  lineHeight: 1.58,
                  border: message.role === "assistant" ? "1px solid #e8e8e8" : "none",
                  overflowWrap: "anywhere",
                }}
              >
                {message.role === "assistant" ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#111",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                AI
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "white",
                  border: "1px solid #e8e8e8",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#ccc",
                      display: "block",
                      animation: `bounce 1.2s ${dot * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div
            style={{
              padding: "0 20px 14px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                style={{
                  padding: "12px 14px",
                  fontSize: 12.5,
                  border: "1px solid #e2e2e2",
                  borderRadius: 12,
                  background: "white",
                  color: "#444",
                  cursor: "pointer",
                  textAlign: "left",
                  lineHeight: 1.45,
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            padding: "12px 20px 16px",
            borderTop: "1px solid #e8e8e8",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Scrie întrebarea ta despre legislație..."
              rows={2}
              style={{
                flex: 1,
                padding: "10px 14px",
                fontSize: 13.5,
                border: "1px solid #e2e2e2",
                borderRadius: 10,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                color: "#111",
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!canSend}
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: canSend ? "#111" : "#e0e0e0",
                color: canSend ? "white" : "#aaa",
                border: "none",
                cursor: canSend ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#9a9a9a", marginTop: 8, textAlign: "center" }}>
            Răspunsurile sunt generate cu streaming și trebuie verificate în documentele oficiale citate.
          </p>
        </div>
      </div>

      <aside style={{ width: 320, flexShrink: 0, height: "100%", minHeight: 0, background: "rgba(255,255,255,0.75)", borderLeft: "1px solid #e8e8e8", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "#8b8b8b",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Fragmente și surse
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            {resolvedSource
              ? `Sursa predominantă: ${resolvedSource}`
              : "Agentul alege sursa în funcție de întrebare."}
          </div>
        </div>

        {fragments.length === 0 ? (
          <div style={{ padding: "24px 16px", color: "#8f8f8f", fontSize: 12.5, lineHeight: 1.6 }}>
            Fragmentele legislative extrase vor apărea aici după prima întrebare.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {fragments.map((fragment) => (
              <div
                key={fragment.id}
                style={{
                  background: "#fafafa",
                  border: "1px solid #ebebeb",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {fragment.label}
                    </div>
                    {fragment.similarity && (
                      <div style={{ fontSize: 10.5, color: "#9b9b9b", marginTop: 3 }}>
                        {fragment.similarity}
                      </div>
                    )}
                  </div>
                  {fragment.href && (
                    <a
                      href={fragment.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#888", flexShrink: 0 }}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#404040",
                    fontWeight: 600,
                    lineHeight: 1.45,
                    marginBottom: 8,
                  }}
                >
                  {fragment.law}
                </div>
                <p style={{ fontSize: 12, color: "#4f4f4f", lineHeight: 1.55 }}>{fragment.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});
