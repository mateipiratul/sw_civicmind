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
    <div className="chat-root">
      <div className="chat-main">
        <div className="chat-header">
          <h1>Chat legislativ</h1>
          <p>Răspunsuri cu streaming și surse din corpusul legislativ indexat.</p>
        </div>

        <div className="chat-body">
          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role === "user" ? "user" : "assistant"}`}>
              {message.role === "assistant" && <div className="avatar">AI</div>}
              <div className={`message-bubble ${message.role === "user" ? "user" : "assistant"}`}>
                {message.role === "assistant" ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="loading-row">
              <div className="avatar">AI</div>
              <div className="loading-bubble">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className={`dot delay-${dot}`} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} onClick={() => sendMessage(suggestion)} className="suggestion-btn">
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="input-area">
          <div className="input-row">
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
              className="textarea"
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!canSend}
              className="send-button"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="input-note">Răspunsurile sunt generate cu streaming și trebuie verificate în documentele oficiale citate.</p>
        </div>
      </div>
      <aside className="aside">
        <div className="sources-header">
          <div className="sources-label">Fragmente și surse</div>
          <div className="sources-sub">
            {resolvedSource ? `Sursa predominantă: ${resolvedSource}` : "Agentul alege sursa în funcție de întrebare."}
          </div>
        </div>

        {fragments.length === 0 ? (
          <div className="fragments-empty">Fragmentele legislative extrase vor apărea aici după prima întrebare.</div>
        ) : (
          <div className="fragments-list">
            {fragments.map((fragment) => (
              <div key={fragment.id} className="source-card">
                <div className="source-header">
                  <div>
                    <div className="source-label">{fragment.label}</div>
                    {fragment.similarity && <div className="source-sim">{fragment.similarity}</div>}
                  </div>
                  {fragment.href && (
                    <a href={fragment.href} target="_blank" rel="noopener noreferrer" style={{ color: "#888", flexShrink: 0 }}>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <div className="source-law">{fragment.law}</div>
                <p className="source-excerpt">{fragment.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});
