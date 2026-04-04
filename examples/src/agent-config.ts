import type { WidgetConfig } from "@deepgram/agent-widget";

/**
 * Fetches a short-lived bearer token from the dev-server proxy.
 * The proxy calls POST /v1/auth/grant with the real API key server-side;
 * the browser only ever receives the 30-second JWT.
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
  tokenFactory,

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
