import { describe, it, expect, afterEach } from "bun:test";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * E2E tests for AgentSession against the real Deepgram Agent API.
 *
 * Requirements:
 * - DEEPGRAM_API_KEY env var (tests skip without it)
 * - Node.js runtime OR browser environment (Bun's native WebSocket doesn't
 *   support the Sec-WebSocket-Protocol auth trick used by @deepgram/sdk)
 *
 * Run: DEEPGRAM_API_KEY=... bun run test:e2e
 * Or:  op run --env-file examples/.env -- bun run test:e2e
 *
 * Note: These tests may fail under Bun's native WebSocket. If so, run
 * with Node.js: DEEPGRAM_API_KEY=... npx tsx --test tests/e2e/
 */

// Detect if we're in an environment where the SDK can connect
let canConnect = false;
if (DEEPGRAM_API_KEY) {
  try {
    // Quick probe — try to open a WebSocket with subprotocol auth
    const ws = new WebSocket("wss://agent.deepgram.com/v1", ["token", DEEPGRAM_API_KEY]);
    await new Promise<void>((resolve) => {
      ws.onopen = () => { canConnect = true; ws.close(); resolve(); };
      ws.onerror = () => { ws.close(); resolve(); };
      ws.onclose = () => resolve();
      setTimeout(() => { try { ws.close(); } catch {} resolve(); }, 3000);
    });
  } catch {
    canConnect = false;
  }
}

const { AgentSession } = await import("../../packages/sdk/src/agent-session.js");

const agentConfig = {
  listen: {
    provider: { type: "deepgram", version: "v1", model: "nova-3" },
  },
  think: {
    provider: { type: "open_ai", model: "gpt-4o-mini" },
    prompt: "You are a helpful assistant. Keep responses brief.",
  },
  speak: {
    provider: { type: "deepgram", model: "aura-2-thalia-en" },
  },
};

function createSession(overrides = {}) {
  return new AgentSession({
    auth: { apiKey: DEEPGRAM_API_KEY! },
    agent: agentConfig,
    audio: {
      input: { encoding: "linear16", sampleRate: 16_000 },
      output: { encoding: "linear16", sampleRate: 24_000 },
    },
    reconnect: { enabled: false },
    ...overrides,
  } as any);
}

describe.skipIf(!canConnect)("E2E: AgentSession", () => {
  let session: InstanceType<typeof AgentSession> | null = null;

  afterEach(() => {
    if (session) {
      session.disconnect();
      session.removeAllListeners();
      session = null;
    }
  });

  it("connects and receives Welcome event", async () => {
    session = createSession();

    const welcome = new Promise<unknown>((resolve, reject) => {
      session!.on("welcome", resolve);
      session!.on("sdk-error", reject);
    });

    await session.connect();
    expect(session.state).toBe("connected");

    const msg = await welcome;
    expect(msg).toBeDefined();
  });

  it("receives SettingsApplied after Welcome", async () => {
    session = createSession();

    const settingsApplied = new Promise<unknown>((resolve, reject) => {
      session!.on("settings-applied", resolve);
      session!.on("sdk-error", reject);
    });

    await session.connect();
    const msg = await settingsApplied;
    expect(msg).toBeDefined();
  });

  it("can inject a user message without error", async () => {
    session = createSession();

    const ready = new Promise<void>((resolve, reject) => {
      session!.on("settings-applied", () => resolve());
      session!.on("sdk-error", reject);
    });

    await session.connect();
    await ready;

    expect(() => {
      session!.injectAgentMessage("Hello from E2E test");
    }).not.toThrow();
  });

  it("disconnects gracefully", async () => {
    session = createSession();

    await session.connect();
    expect(session.state).toBe("connected");

    const disconnected = new Promise<string>((resolve) => {
      session!.on("disconnected", resolve);
    });

    session.disconnect();

    const reason = await disconnected;
    expect(reason).toBe("user requested disconnect");
    expect(session.state).toBe("disconnected");
  });
});
