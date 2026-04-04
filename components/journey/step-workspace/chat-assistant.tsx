"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatAssistantProps {
  systemPrompt: string;
}

export function ChatAssistant({ systemPrompt }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: { systemPrompt },
      }),
    [systemPrompt],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-medium text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl"
      >
        <MessageSquare className="h-4 w-4" />
        Ask Career Steer
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[480px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-accent px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent-foreground" />
          <span className="text-sm font-semibold text-accent-foreground">
            Career Steer
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-accent-foreground/70 transition-colors hover:bg-accent-foreground/10 hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ask me anything about this step or your career goals.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.role === "user"
                ? message.parts
                    .filter(
                      (p): p is Extract<typeof p, { type: "text" }> =>
                        p.type === "text",
                    )
                    .map((p, i) => <span key={i}>{p.text}</span>)
                : message.parts
                    .filter(
                      (p): p is Extract<typeof p, { type: "text" }> =>
                        p.type === "text",
                    )
                    .map((p, i) => (
                      <div key={i} className="chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {p.text}
                        </ReactMarkdown>
                      </div>
                    ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
        />
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
