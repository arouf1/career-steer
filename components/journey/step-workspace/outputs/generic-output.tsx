"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface GenericOutputProps {
  output: { content: string };
}

export function GenericOutputDisplay({ output }: GenericOutputProps) {
  return (
    <div className="step-markdown text-sm leading-relaxed text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {output.content}
      </ReactMarkdown>
    </div>
  );
}
