"use client";

import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isConnecting: boolean;
  isSupported: boolean;
  error: string | null;
  liveTranscript?: string;
  onStart: () => void;
  onStop: () => void;
  className?: string;
  size?: "sm" | "default";
}

export function MicrophoneButton({
  isRecording,
  isConnecting,
  isSupported,
  error,
  liveTranscript,
  onStart,
  onStop,
  className,
  size = "default",
}: MicrophoneButtonProps) {
  if (!isSupported) return null;

  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  const label = isConnecting
    ? "Connecting…"
    : isRecording
      ? liveTranscript || "Listening… click to stop"
      : error
        ? error
        : "Dictate with microphone";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={isConnecting}
          onClick={isRecording ? onStop : onStart}
          className={cn(
            "relative inline-flex items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            isRecording
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : isConnecting
                ? "text-muted-foreground"
                : error
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            sizeClasses,
            className,
          )}
        >
          {isConnecting ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : isRecording ? (
            <Square className={cn(iconSize, "fill-current")} />
          ) : (
            <Mic className={iconSize} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
