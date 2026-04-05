"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechToTextOptions {
  /** Called on every delta (isFinal=false) and on turn completion (isFinal=true). */
  onTranscript: (text: string, isFinal: boolean) => void;
}

interface UseSpeechToTextReturn {
  isRecording: boolean;
  isConnecting: boolean;
  liveTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
  isSupported: boolean;
}

function checkSupport(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof RTCPeerConnection !== "undefined"
  );
}

export function useSpeechToText({
  onTranscript,
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const accumulatedRef = useRef("");

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    accumulatedRef.current = "";
    setLiveTranscript("");
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stopRecording = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setIsConnecting(false);
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    cleanup();
    setError(null);
    setIsConnecting(true);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied");
      setIsConnecting(false);
      return;
    }
    streamRef.current = stream;

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.addTrack(stream.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        setIsConnecting(false);
        setIsRecording(true);
      });

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);

          if (
            event.type ===
            "conversation.item.input_audio_transcription.delta"
          ) {
            accumulatedRef.current += event.delta;
            setLiveTranscript(accumulatedRef.current);
            onTranscriptRef.current(accumulatedRef.current, false);
          } else if (
            event.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            const finalText: string = event.transcript ?? "";
            if (finalText.trim()) {
              onTranscriptRef.current(finalText.trim(), true);
            }
            accumulatedRef.current = "";
            setLiveTranscript("");
          }
        } catch {
          /* ignore malformed events */
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setError("Connection lost");
          stopRecording();
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch("/api/transcribe/session", {
        method: "POST",
        body: offer.sdp,
        headers: { "Content-Type": "application/sdp" },
      });

      if (!res.ok) {
        throw new Error("Failed to create transcription session");
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({
        type: "answer" as RTCSdpType,
        sdp: answerSdp,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      cleanup();
      setIsConnecting(false);
    }
  }, [cleanup, stopRecording]);

  return {
    isRecording,
    isConnecting,
    liveTranscript,
    startRecording,
    stopRecording,
    error,
    isSupported: checkSupport(),
  };
}
