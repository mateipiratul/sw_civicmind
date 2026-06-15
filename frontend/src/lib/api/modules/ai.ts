import { BaseApiClient, ApiError } from '../base';
import type { RagChatOptions, RagChatResponse, RagStreamEvent } from '../types/rag';

export class AIModule extends BaseApiClient {
  /**
   * Uses AI to analyze natural language onboarding text and derive county/interests
   */
  analyzeOnboardingProfile = async (text: string, available_counties: string[], available_categories: string[]): Promise<{county: string | null, interests: string[]}> => {
    return this.requestTo(this.aiBaseUrl, "/profiles/analyze-onboarding", {
      method: "POST",
      body: JSON.stringify({ text, available_counties, available_categories })
    });
  };

  ragChat = async (question: string, options: RagChatOptions = {}): Promise<RagChatResponse> => {
    return this.requestTo<RagChatResponse>(this.aiBaseUrl, "/rag/chat", {
      method: "POST",
      body: JSON.stringify({
        question,
        top_k: options.top_k ?? 8,
        threshold: options.threshold ?? 0.72,
        source: options.source,
        bill_idp: options.bill_idp,
        exclude_bill_idp: options.exclude_bill_idp,
      }),
    });
  };

  /**
   * Streamed RAG Chat with event handlers
   */
  streamRagChat = async (
    question: string,
    options: RagChatOptions = {},
    handlers: {
      onEvent?: (event: RagStreamEvent) => void;
    } = {},
  ): Promise<RagChatResponse> => {
    const response = await fetch(`${this.aiBaseUrl}/rag/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        question,
        top_k: options.top_k ?? 8,
        threshold: options.threshold ?? 0.72,
        source: options.source,
        bill_idp: options.bill_idp,
        exclude_bill_idp: options.exclude_bill_idp,
      }),
    });

    if (!response.ok) {
      let detail = `API Error: ${response.status}`;
      try {
        const data = await response.json();
        detail = data.detail || data.error || detail;
      } catch {
        // Keep the status-based message when the response body is not JSON.
      }
      throw new ApiError(detail, response.status);
    }

    if (!response.body) {
      return this.ragChat(question, options);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResponse: RagChatResponse | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let event: RagStreamEvent;
        try {
          event = JSON.parse(trimmed) as RagStreamEvent;
        } catch (e) {
          console.error("Failed to parse stream event", trimmed, e);
          continue;
        }

        handlers.onEvent?.(event);
        if (event.type === "error") throw new ApiError(event.error, 503);
        if (event.type === "done") {
          finalResponse = {
            answer: event.answer,
            sources: event.sources,
            resolved_source: event.resolved_source,
            agent_mode: event.agent_mode,
          };
        }
      }
    }
    
    if (!finalResponse) {
        return this.ragChat(question, options);
    }

    return finalResponse;
  };
}
