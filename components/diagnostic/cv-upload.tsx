"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";

interface Profile {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string | { display: string; canonical: string };
  education: string;
}

interface CvUploadProps {
  onExtracted: (profile: Partial<Profile>) => void;
  onSkip: () => void;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string }
  | { status: "error"; message: string };

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function stripEmpty(profile: Record<string, string>): Partial<Profile> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value && value.trim().length > 0) {
      result[key] = value;
    }
  }
  return result as Partial<Profile>;
}

export function CvUpload({ onExtracted, onSkip }: CvUploadProps) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragOver, setIsDragOver] = useState(false);
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

      setState({ status: "uploading", fileName: file.name });

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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Get started faster
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CV and we&apos;ll pre-fill your profile automatically, or
          skip this and fill everything in manually.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={state.status === "uploading"}
        className={`flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-accent bg-accent/5"
            : state.status === "error"
              ? "border-destructive/50 hover:border-destructive"
              : "border-border hover:border-muted-foreground/40"
        } ${state.status === "uploading" ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        {state.status === "uploading" ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Analysing your CV…
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {state.fileName}
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

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onSkip}>
          Skip — I&apos;ll fill it in manually
        </Button>
      </div>
    </div>
  );
}
