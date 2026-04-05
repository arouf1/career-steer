"use client";

import {
  useRef,
  useCallback,
  type ComponentProps,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { MicrophoneWaveform } from "@/components/ui/waveform";
import { MicrophoneButton } from "@/components/ui/microphone-button";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  insertTextAtCursor,
  beginPendingInsertion,
  applyPendingInsertion,
  type PendingInsertion,
} from "@/lib/speech";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

interface UseSpeechTextareaOptions {
  /** Current textarea value (kept in sync via a ref). */
  value: string;
  /** Visual-only state setter — called for live transcription deltas. */
  setValue: (value: string) => void;
  /** Called for keystrokes and final transcriptions (trigger save / grade here). */
  onCommit: (value: string) => void;
}

export function useSpeechTextarea({
  value,
  setValue,
  onCommit,
}: UseSpeechTextareaOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef<PendingInsertion | null>(null);

  const valueRef = useRef(value);
  valueRef.current = value;
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const speech = useSpeechToText({
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      const el = textareaRef.current;
      const current = valueRef.current;

      if (!isFinal) {
        if (!pendingRef.current) {
          pendingRef.current = beginPendingInsertion(el, current);
        }
        const result = applyPendingInsertion(
          pendingRef.current,
          current,
          text,
        );
        pendingRef.current = result.pending;
        setValueRef.current(result.newValue);
        return;
      }

      if (pendingRef.current) {
        const result = applyPendingInsertion(
          pendingRef.current,
          current,
          text,
        );
        const cursorPos =
          pendingRef.current.start +
          pendingRef.current.prefix.length +
          text.length;
        pendingRef.current = null;
        onCommitRef.current(result.newValue);
        if (el) {
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = cursorPos;
            el.focus();
          });
        }
      } else if (el) {
        const { newValue, newCursorPos } = insertTextAtCursor(
          el,
          current,
          text,
        );
        onCommitRef.current(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = newCursorPos;
          el.focus();
        });
      } else {
        onCommitRef.current(
          current + (current.length > 0 ? " " : "") + text,
        );
      }
    }, []),
  });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      pendingRef.current = null;
      onCommitRef.current(e.target.value);
    },
    [],
  );

  return { textareaRef, handleChange, speech };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface SpeechTextareaMicProps {
  isRecording: boolean;
  isConnecting: boolean;
  isSupported: boolean;
  error: string | null;
  liveTranscript?: string;
  onStart: () => void;
  onStop: () => void;
}

interface SpeechTextareaProps
  extends Omit<ComponentProps<typeof Textarea>, "ref" | "onChange"> {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isRecording: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  /** Renders the dictation control in the bottom-right of the textarea. */
  mic?: SpeechTextareaMicProps;
  micSize?: "sm" | "default";
  /** Shown inside the field, bottom-right, to the left of the mic. */
  characterCount?: ReactNode;
}

export function SpeechTextarea({
  textareaRef,
  isRecording,
  onChange,
  className,
  mic,
  micSize = "sm",
  characterCount,
  ...props
}: SpeechTextareaProps) {
  const hasMic = Boolean(mic?.isSupported);
  const hasCount = characterCount != null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border/50 transition-colors duration-200",
      )}
    >
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isRecording ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="mx-auto w-1/2 overflow-hidden">
          <MicrophoneWaveform
            active={isRecording}
            height={40}
            barWidth={2}
            barGap={1}
            sensitivity={0.6}
            smoothingTimeConstant={0.85}
          />
        </div>
      </div>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          className={cn(
            /* Match prompt copy; base Textarea is text-base until md: */
            "text-sm",
            /* Full-width typing: avoid field-sizing-content shrinking width; no large pr-* (that narrowed every line). */
            "min-w-0 w-full [field-sizing:fixed]",
            "rounded-none border-0 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground/45",
            (hasMic || hasCount) && "pb-11",
            className,
          )}
          onChange={onChange}
          {...props}
        />
        {hasMic || hasCount ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex max-w-[calc(100%-0.75rem)] items-center justify-end gap-2 p-1.5">
            {hasCount ? (
              <div className="pointer-events-none flex min-w-0 shrink items-center justify-end text-right text-xs tabular-nums leading-tight">
                {characterCount}
              </div>
            ) : null}
            {mic ? (
              <div className="pointer-events-auto shrink-0">
                <MicrophoneButton
                  isRecording={mic.isRecording}
                  isConnecting={mic.isConnecting}
                  isSupported={mic.isSupported}
                  error={mic.error}
                  liveTranscript={mic.liveTranscript}
                  onStart={mic.onStart}
                  onStop={mic.onStop}
                  size={micSize}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
