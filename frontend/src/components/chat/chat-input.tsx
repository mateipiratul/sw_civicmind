import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  canSend: boolean;
}

export function ChatInput({ input, setInput, onSend, canSend }: ChatInputProps) {
  return (
    <div className="input-area">
      <div className="input-row">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend(input);
            }
          }}
          placeholder="Scrie întrebarea ta despre legislație..."
          rows={2}
          className="textarea"
        />
        <button
          onClick={() => onSend(input)}
          disabled={!canSend}
          className="send-button"
        >
          <Send size={15} />
        </button>
      </div>
      <p className="input-note">Răspunsurile sunt generate cu streaming și trebuie verificate în documentele oficiale citate.</p>
    </div>
  );
}
