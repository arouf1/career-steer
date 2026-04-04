"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Link2,
} from "lucide-react";

interface Profile {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string | { display: string; canonical: string };
  education: string;
}

interface ProfileImportProps {
  onExtracted: (profile: Partial<Profile>) => void;
  onSkip: () => void;
}

type ImportState =
  | { status: "idle" }
  | { status: "uploading"; label: string }
  | { status: "error"; message: string };

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const LINKEDIN_URL_PATTERN =
  /^https?:\/\/(\w+\.)?linkedin\.com\/in\/[\w-]+\/?/i;

function stripEmpty(profile: Record<string, string>): Partial<Profile> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value && value.trim().length > 0) {
      result[key] = value;
    }
  }
  return result as Partial<Profile>;
}

export function ProfileImport({ onExtracted, onSkip }: ProfileImportProps) {
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setState({
          status: "error",
          message: "Only PDF and DOCX files are accepted.",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setState({ status: "error", message: "File must be under 5 MB." });
        return;
      }

      setState({ status: "uploading", label: file.name });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/cv/parse", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setState({
            status: "error",
            message: data.error ?? "Something went wrong. Please try again.",
          });
          return;
        }

        onExtracted(stripEmpty(data.profile));
      } catch {
        setState({
          status: "error",
          message:
            "Network error. Please check your connection and try again.",
        });
      }
    },
    [onExtracted],
  );

  const processLinkedIn = useCallback(async () => {
    const trimmed = linkedInUrl.trim();

    if (!trimmed) {
      setState({ status: "error", message: "Please enter a LinkedIn URL." });
      return;
    }

    if (!LINKEDIN_URL_PATTERN.test(trimmed)) {
      setState({
        status: "error",
        message:
          "Please enter a valid LinkedIn profile URL (e.g. https://linkedin.com/in/your-name).",
      });
      return;
    }

    setState({ status: "uploading", label: "LinkedIn profile" });

    try {
      const res = await fetch("/api/linkedin/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      onExtracted(stripEmpty(data.profile));
    } catch {
      setState({
        status: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }, [linkedInUrl, onExtracted]);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  const isLoading = state.status === "uploading";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Get started faster
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CV or import your LinkedIn profile and we&apos;ll
          pre-fill your details automatically, or skip this and fill everything
          in manually.
        </p>
      </div>

      <Tabs defaultValue="cv">
        <TabsList>
          <TabsTrigger value="cv" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CV
          </TabsTrigger>
          <TabsTrigger value="linkedin" disabled={isLoading}>
            <Link2 className="mr-2 h-4 w-4" />
            LinkedIn Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cv">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            disabled={isLoading}
            className={`flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragOver
                ? "border-accent bg-accent/5"
                : state.status === "error"
                  ? "border-destructive/50 hover:border-destructive"
                  : "border-border hover:border-muted-foreground/40"
            } ${isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Analysing your CV…
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {state.label}
                  </p>
                </div>
              </>
            ) : state.status === "error" ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div className="text-center">
                  <p className="text-sm font-medium text-destructive">
                    {state.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click or drag to try again
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  {isDragOver ? (
                    <FileText className="h-6 w-6 text-accent" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isDragOver
                      ? "Drop your CV here"
                      : "Drag and drop your CV, or click to browse"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PDF or DOCX, up to 5 MB
                  </p>
                </div>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="linkedin">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="linkedin-url"
                className="text-sm font-medium text-foreground"
              >
                LinkedIn profile URL
              </label>
              <input
                id="linkedin-url"
                type="url"
                placeholder="https://linkedin.com/in/your-name"
                value={linkedInUrl}
                onChange={(e) => {
                  setLinkedInUrl(e.target.value);
                  if (state.status === "error") setState({ status: "idle" });
                }}
                disabled={isLoading}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              />
            </div>

            {state.status === "error" && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{state.message}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <p className="text-sm font-medium text-foreground">
                  Analysing your LinkedIn profile…
                </p>
              </div>
            ) : (
              <Button
                onClick={processLinkedIn}
                disabled={!linkedInUrl.trim()}
                className="w-full"
                variant="accent"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Import from LinkedIn
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
          Skip — I&apos;ll fill it in manually
        </Button>
      </div>
    </div>
  );
}
