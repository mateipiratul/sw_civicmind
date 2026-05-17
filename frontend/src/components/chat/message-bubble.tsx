import { Markdown } from "@/components/ui/markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message-row ${message.role === "user" ? "user" : "assistant"}`}>
      {message.role === "assistant" && <div className="avatar">AI</div>}
      <div className={`message-bubble ${message.role === "user" ? "user" : "assistant"}`}>
        {message.role === "assistant" ? (
          <Markdown content={message.content} />
        ) : (
          <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
        )}
      </div>
    </div>
  );
}
