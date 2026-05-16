import React, { useEffect, useRef, useState } from "react";
import { MessageSquareText, Send, X, FileText } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { api, type Bill, type RagSource } from "@/lib/api";

type BillChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface BillChatProps {
  bill: Bill;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function BillChat({ bill }: BillChatProps) {
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState<BillChatMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaSources, setQaSources] = useState<RagSource[]>([]);
  const qaBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qaOpen) {
      qaBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [qaMessages, qaSources, qaLoading, qaOpen]);

  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = qaQuestion.trim();
    if (!q || qaLoading) return;
    const userMessage: BillChatMessage = { id: createId(), role: "user", content: q };
    const assistantId = createId();
    let assistantStarted = false;

    setQaQuestion("");
    setQaMessages(prev => [...prev, userMessage]);
    setQaSources([]);
    setQaLoading(true);
    try {
      await api.streamRagChat(q, { bill_idp: bill.idp }, {
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

  return (
    <>
      {!qaOpen && (
        <button
          type="button"
          onClick={() => setQaOpen(true)}
          className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gray-900 text-white shadow-xl border border-white/10 hover:bg-gray-800 transition-all active:scale-95 font-bold text-[13.5px]"
          aria-label="Deschide chatul AI pentru acest proiect"
        >
          <MessageSquareText size={18} />
          Intreaba AI
        </button>
      )}

      {qaOpen && (
        <div className="fixed right-6 bottom-6 w-[min(440px,calc(100vw-32px))] h-[min(640px,calc(100vh-88px))] z-50 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold">
                AI
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-gray-900">Chat despre proiect</div>
                <div className="text-[11.5px] text-gray-400 truncate uppercase font-medium tracking-wider">{bill.bill_number}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQaOpen(false)}
              className="w-8 h-8 rounded-lg border-none bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-center shrink-0"
              aria-label="Inchide chatul"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {qaMessages.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 leading-relaxed bg-gray-50/50">
                Salut! Sunt asistentul tău legislativ. Întreabă-mă cum te afectează acest proiect, ce prevederi specifice conține sau ce documente oficiale stau la baza analizei.
              </div>
            )}
            {qaMessages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "bg-gray-900 text-white rounded-br-none"
                      : "bg-gray-50 text-gray-900 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Markdown content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            {qaLoading && qaMessages[qaMessages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 items-center text-gray-400 text-sm italic">
                <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold">AI</div>
                Se generează răspunsul...
              </div>
            )}
            {qaSources.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {qaSources.slice(0, 3).map((src, i) => (
                  <div
                    key={`${src.document_id}-${i}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-600 max-w-[160px] truncate group"
                  >
                    <FileText size={12} className="shrink-0 text-gray-300" />
                    <span className="truncate font-medium">{src.title || src.document_id}</span>
                  </div>
                ))}
              </div>
            )}
            <div ref={qaBottomRef} />
          </div>

          <form
            onSubmit={handleQaSubmit}
            className="p-4 border-t border-gray-100 bg-white flex gap-2 shrink-0"
          >
            <input
              type="text"
              value={qaQuestion}
              onChange={e => setQaQuestion(e.target.value)}
              placeholder="Întreabă despre acest proiect..."
              disabled={qaLoading}
              className="flex-1 min-w-0 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={qaLoading || !qaQuestion.trim()}
              className="w-10 h-10 rounded-xl border-none bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center shrink-0 shadow-sm"
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
