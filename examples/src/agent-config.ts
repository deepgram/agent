import type { WidgetConfig } from "@deepgram/agent-widget";

/**
 * Fetches a short-lived Deepgram access token from the dev-server proxy.
 * NOTE: The /v1/auth/grant endpoint issues tokens scoped to "asr:write" only
 * which is insufficient for the agent API. Pass apiKey directly for dev use.
 */
async function tokenFactory(): Promise<string> {
  const res = await fetch("/api/token");
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Token request failed: ${res.status}`);
  }
  const data = await res.json() as { token?: string; error?: string };
  if (!data.token) throw new Error(data.error ?? "No token in response");
  return data.token;
}

export const baseConfig: Omit<WidgetConfig, "layout" | "containerId"> = {
  // Use the raw API key for development — the auth/grant endpoint only issues
  // asr:write scoped tokens which are not sufficient for the agent API.
  // In production, swap this for a backend that issues agent-scoped tokens.
  apiKey: (() => {
    const k = import.meta.env.VITE_DEEPGRAM_API_KEY;
    console.log("[config] VITE_DEEPGRAM_API_KEY present:", !!k, "length:", k?.length ?? 0);
    return k;
  })(),

  agent: {
    listen: {
      provider: { type: "deepgram", version: "v1", model: "nova-3" },
    },
    think: {
      provider: { type: "open_ai", model: "gpt-4o-mini" },
      prompt: "You are a helpful Deepgram voice assistant. Be concise.",
    },
    speak: {
      provider: { type: "deepgram", model: "aura-2-thalia-en" },
    },
    greeting: "Hi! I'm your Deepgram voice assistant. How can I help?",
  },

  showTranscript: true,
  vad: false,

  on: {
    onConnect:    () => console.log("[dg-agent] connected"),
    onDisconnect: (reason) => console.log("[dg-agent] disconnected:", reason),
    onError:      (err) => console.error("[dg-agent] error:", err),
  },
};
