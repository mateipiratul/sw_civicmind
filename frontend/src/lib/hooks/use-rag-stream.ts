import { useState } from "react";
import { api, type RagSource, type RagChatOptions, type RagStreamEvent, ApiError } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function buildErrorMessage(error: unknown) {
  return "Ne pare rău, a apărut o problemă la conectarea cu asistentul AI. Te rugăm să încerci din nou mai târziu.";
}

export function useRagStream(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<RagSource[]>([]);
  const [resolvedSource, setResolvedSource] = useState<string | null>(null);

  const sendMessage = async (text: string, options: RagChatOptions = {}) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmedText };
    const assistantId = createId();
    let assistantStarted = false;
    let streamedText = "";

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSources([]);
    setResolvedSource(null);

    try {
      const result = await api.streamRagChat(trimmedText, options, {
        onEvent: (event: RagStreamEvent) => {
          if (event.type === "start") {
            setResolvedSource(event.resolved_source ?? null);
            return;
          }

          if (event.type === "sources") {
            setSources(event.items);
            return;
          }

          if (event.type === "token") {
            streamedText += event.delta;
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: event.delta }]);
            } else {
              setMessages(prev =>
                prev.map(message =>
                  message.id === assistantId
                    ? { ...message, content: message.content + event.delta }
                    : message
                )
              );
            }
            return;
          }

          if (event.type === "done") {
            setResolvedSource(event.resolved_source ?? null);
            setSources(event.sources);
            if (!assistantStarted) {
              assistantStarted = true;
              streamedText = event.answer;
              setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: event.answer }]);
            } else if (event.answer && event.answer !== streamedText) {
              streamedText = event.answer;
              setMessages(prev =>
                prev.map(message =>
                  message.id === assistantId ? { ...message, content: event.answer } : message
                )
              );
            }
          }
        }
      });

      // Fallback if no tokens were streamed but we got a result
      if (!assistantStarted && result.answer) {
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: result.answer }]);
      }
      
      setSources(result.sources || []);
      setResolvedSource(result.resolved_source ?? null);

    } catch (error) {
      console.error("RAG Chat Stream Error:", error);
      const errorMessage = buildErrorMessage(error);
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: errorMessage }]);
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    sources,
    resolvedSource,
    sendMessage
  };
}
