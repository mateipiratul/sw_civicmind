import { useEffect, useMemo, useRef, useState } from "react";
import type { RagSource } from "@/lib/api";
import { useRagStream, type ChatMessage } from "@/lib/hooks/use-rag-stream";
import { MessageBubble } from "./message-bubble";
import { SourceCard, type Fragment } from "./source-card";
import { ChatInput } from "./chat-input";

const WELCOME: ChatMessage = {
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

export function ChatPage() {
  const { messages, isLoading, sources, resolvedSource, sendMessage } = useRagStream([WELCOME]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fragments = useMemo(() => sources.map(toFragment), [sources]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, fragments, isLoading]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const handleSend = (text: string) => {
    sendMessage(text);
    setInput("");
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
              <button key={suggestion} onClick={() => handleSend(suggestion)} className="suggestion-btn">
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <ChatInput 
          input={input}
          setInput={setInput}
          onSend={handleSend}
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
