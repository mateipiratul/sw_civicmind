import React, { useEffect, useRef, useState } from "react";
import { MessageSquareText, Send, X, FileText } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import type { Bill } from "@/lib/api";
import { useRagStream } from "@/lib/hooks/use-rag-stream";

interface BillChatProps {
  bill: Bill;
}

export function BillChat({ bill }: BillChatProps) {
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const { messages, isLoading, sources, sendMessage } = useRagStream([]);
  const qaBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qaOpen) {
      qaBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sources, isLoading, qaOpen]);

  const handleQaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || isLoading) return;
    sendMessage(qaQuestion, { bill_idp: bill.idp });
    setQaQuestion("");
  };

  return (
    <>
      {!qaOpen && (
        <button
          type="button"
          onClick={() => setQaOpen(true)}
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
            borderRadius: "999px",
            background: "var(--primary)",
            color: "var(--primary-text)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13.5px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          aria-label="Deschide chatul AI pentru acest proiect"
        >
          <MessageSquareText size={18} />
          Intreaba AI
        </button>
      )}

      {qaOpen && (
        <div 
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            width: "min(440px, calc(100vw - 32px))",
            height: "min(640px, calc(100vh - 88px))",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ 
                width: "32px", 
                height: "32px", 
                borderRadius: "50%", 
                background: "var(--primary)", 
                color: "var(--primary-text)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: "11px", 
                fontWeight: 700 
              }}>
                AI
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>Chat despre proiect</div>
                <div style={{ 
                  fontSize: "11px", 
                  color: "var(--text-muted)", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.05em",
                  fontWeight: 600
                }}>
                  {bill.bill_number}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQaOpen(false)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-muted)",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
              aria-label="Inchide chatul"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {messages.length === 0 && (
              <div style={{ 
                borderRadius: "12px", 
                border: "1px dashed var(--border)", 
                padding: "20px", 
                fontSize: "13.5px", 
                color: "var(--text-muted)", 
                lineHeight: 1.6, 
                background: "var(--bg)" 
              }}>
                Salut! Sunt asistentul tău legislativ. Întreabă-mă cum te afectează acest proiect, ce prevederi specifice conține sau ce documente oficiale stau la baza analizei.
              </div>
            )}
            {messages.map(message => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: message.role === "user" ? "flex-end" : "flex-start"
                }}
              >
                {message.role === "assistant" && (
                  <div style={{ 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "50%", 
                    background: "var(--primary)", 
                    color: "var(--primary-text)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "10px", 
                    fontWeight: 700, 
                    flexShrink: 0, 
                    marginTop: "4px" 
                  }}>
                    AI
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    fontSize: "13.5px",
                    lineHeight: 1.6,
                    background: message.role === "user" ? "var(--primary)" : "var(--bg)",
                    color: message.role === "user" ? "var(--primary-text)" : "var(--text)",
                    border: message.role === "assistant" ? "1px solid var(--border)" : "none",
                    borderBottomRightRadius: message.role === "user" ? "4px" : "16px",
                    borderBottomLeftRadius: message.role === "assistant" ? "4px" : "16px",
                  }}
                >
                  {message.role === "assistant" ? (
                    <Markdown content={message.content} />
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", color: "var(--primary-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>AI</div>
                Se generează răspunsul...
              </div>
            )}
            {sources.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: "40px" }}>
                {sources.slice(0, 3).map((src, i) => (
                  <div
                    key={`${src.document_id}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      maxWidth: "160px",
                    }}
                  >
                    <FileText size={12} style={{ flexShrink: 0, color: "var(--text-muted)", opacity: 0.5 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{src.title || src.document_id}</span>
                  </div>
                ))}
              </div>
            )}
            <div ref={qaBottomRef} />
          </div>

          <form
            onSubmit={handleQaSubmit}
            style={{
              padding: "16px",
              borderTop: "1px solid var(--border)",
              background: "var(--surface)",
              display: "flex",
              gap: "8px",
              flexShrink: 0
            }}
          >
            <input
              type="text"
              value={qaQuestion}
              onChange={e => setQaQuestion(e.target.value)}
              placeholder="Întreabă despre acest proiect..."
              disabled={isLoading}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 16px",
                fontSize: "14px",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                transition: "all 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--text)"; e.currentTarget.style.background = "var(--surface)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
            />
            <button
              type="submit"
              disabled={isLoading || !qaQuestion.trim()}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: "none",
                background: (isLoading || !qaQuestion.trim()) ? "var(--color-muted)" : "var(--primary)",
                color: (isLoading || !qaQuestion.trim()) ? "var(--text-muted)" : "var(--primary-text)",
                cursor: (isLoading || !qaQuestion.trim()) ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              aria-label="Trimite intrebarea"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
