import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, type RagSource } from "@/lib/api";
import { MessageBubble } from "./message-bubble";
import { SourceCard, type Fragment } from "./source-card";
import { ChatInput } from "./chat-input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export function ChatPage() {
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
            <MessageBubble key={message.id} message={message} />
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

        <ChatInput 
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          canSend={canSend}
        />
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
              <SourceCard key={fragment.id} fragment={fragment} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
