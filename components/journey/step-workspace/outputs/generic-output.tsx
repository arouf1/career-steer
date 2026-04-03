"use client";

interface GenericOutputProps {
  output: { content: string };
}

export function GenericOutputDisplay({ output }: GenericOutputProps) {
  const paragraphs = output.content.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => {
        if (paragraph.startsWith("# ")) {
          return (
            <h2 key={i} className="text-xl font-bold">
              {paragraph.slice(2)}
            </h2>
          );
        }
        if (paragraph.startsWith("## ")) {
          return (
            <h3 key={i} className="text-lg font-semibold">
              {paragraph.slice(3)}
            </h3>
          );
        }
        if (paragraph.startsWith("### ")) {
          return (
            <h4 key={i} className="font-semibold">
              {paragraph.slice(4)}
            </h4>
          );
        }

        const lines = paragraph.split("\n");
        const isList = lines.every(
          (line) => line.startsWith("- ") || line.startsWith("* "),
        );

        if (isList) {
          return (
            <ul key={i} className="space-y-1">
              {lines.map((line, j) => (
                <li
                  key={j}
                  className="flex gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {line.replace(/^[-*]\s/, "")}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
