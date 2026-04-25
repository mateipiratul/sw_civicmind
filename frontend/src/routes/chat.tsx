import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, ExternalLink } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Fragment {
  id: string;
  date: string;
  excerpt: string;
  law: string;
  href?: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "Salut! Sunt asistentul tău legislativ. Te pot ajuta să înțelegi proiectele de lege, să cauți informații specifice sau să compari inițiative legislative. Ce te pot ajuta?",
};

const SUGGESTIONS = [
  "Găsește proiecte similare despre sănătate",
  "Explică PL-x nr. 123/2025",
  "Ce legi noi au fost adoptate în educație?",
];

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate response — wire to real API later
    await new Promise((r) => setTimeout(r, 900));
    const reply: Message = {
      role: "assistant",
      content: "Conform modificărilor recente propuse și adoptate, iată principalele schimbări relevante pentru întrebarea ta. Informațiile sunt extrase din documentele oficiale ale Camerei Deputaților.",
    };
    setMessages((prev) => [...prev, reply]);
    setFragments([
      {
        id: "1",
        date: "1 Iul 2024, Art. 18",
        excerpt: "...se reduce impozitul aplicat microîntreprinderilor la 1% din cifra de afaceri anuală, cu condiția menținerii...",
        law: "Legea nr. 296/2023",
      },
      {
        id: "2",
        date: "EMD 110/2023",
        excerpt: "...obligativitatea platformei de raportare online pentru unitățile cu peste 10 angajați, cu implementare în termen de 90 de zile...",
        law: "OUG 57/2019",
      },
    ]);
    setIsLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)", overflow: "hidden" }}>
      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid #e8e8e8" }}>
        {/* Chat header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e8e8", background: "white", flexShrink: 0 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>Asistent Legislativ</h1>
          <p style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Întreabă despre legislația din România</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
              }}
            >
              {msg.role === "assistant" && (
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
                  maxWidth: "72%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? "#111" : "white",
                  color: msg.role === "user" ? "white" : "#111",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  border: msg.role === "assistant" ? "1px solid #e8e8e8" : "none",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#111", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                AI
              </div>
              <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "white", border: "1px solid #e8e8e8", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#ccc",
                      display: "block",
                      animation: `bounce 1.2s ${d * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ padding: "0 20px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12.5,
                  border: "1px solid #e2e2e2",
                  borderRadius: 20,
                  background: "white",
                  color: "#555",
                  cursor: "pointer",
                  transition: "border-color 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#aaa"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e2e2"; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Scrie întrebarea ta..."
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
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: input.trim() && !isLoading ? "#111" : "#e0e0e0",
                color: input.trim() && !isLoading ? "white" : "#aaa",
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#bbb", marginTop: 8, textAlign: "center" }}>
            Date din Camera Deputaților României. Verifică întotdeauna informațiile în documentele oficiale.
          </p>
        </div>
      </div>

      {/* Fragments panel */}
      <aside style={{ width: 300, flexShrink: 0, background: "white", overflowY: "auto" }}>
        <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid #e8e8e8" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Fragmente Extrase
          </span>
        </div>

        {fragments.length === 0 ? (
          <div style={{ padding: "24px 16px", color: "#bbb", fontSize: 12.5, lineHeight: 1.6 }}>
            Fragmentele relevante din documentele legislative vor apărea aici după ce trimiți o întrebare.
          </div>
        ) : (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {fragments.map((f, i) => (
              <div
                key={f.id}
                style={{
                  background: "#fafafa",
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Sursa {i + 1}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#bbb" }}>{f.date}</span>
                </div>
                <p style={{ fontSize: 12, color: "#444", lineHeight: 1.55, marginBottom: 8 }}>
                  {f.excerpt}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{f.law}</span>
                  {f.href && (
                    <a href={f.href} target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
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
