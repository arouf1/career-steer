import { auth } from "@clerk/nextjs/server";

const SESSION_CONFIG = JSON.stringify({
  type: "transcription",
  audio: {
    input: {
      transcription: {
        model: "gpt-4o-mini-transcribe",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      noise_reduction: {
        type: "near_field",
      },
    },
  },
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorised", { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Speech-to-text is not configured", { status: 503 });
  }

  const sdp = await req.text();
  if (!sdp.trim()) {
    return new Response("Missing SDP offer", { status: 400 });
  }

  try {
    const fd = new FormData();
    fd.set("sdp", sdp);
    fd.set("session", SESSION_CONFIG);

    const res = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("OpenAI Realtime session error:", res.status, body);
      return new Response("Failed to create transcription session", {
        status: 502,
      });
    }

    const answerSdp = await res.text();
    return new Response(answerSdp, {
      headers: { "Content-Type": "application/sdp" },
    });
  } catch (err) {
    console.error("Realtime session request failed:", err);
    return new Response("Failed to create transcription session", {
      status: 500,
    });
  }
}
