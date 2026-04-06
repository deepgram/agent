import { describe, it, expect, mock } from "bun:test";

// Mock dependencies to avoid importing @deepgram/agent-react transitively
mock.module("@deepgram/agent-react", () => ({
  AgentProvider: ({ children }: any) => children,
  AgentStatus: () => null,
  AgentConversation: () => null,
  AgentTextInput: () => null,
  AgentMicrophoneButton: () => null,
  AgentSpeakerButton: () => null,
  AgentStartButton: () => null,
  useAgentState: () => ({ state: "idle", isActive: false, isConnecting: false, start: async () => {}, stop: () => {} }),
}));

mock.module("@deepgram/agent", () => ({}));

const { buildSessionConfig } = await import("../widget.js");

describe("buildSessionConfig", () => {
  it("throws when neither apiKey nor tokenFactory is provided", () => {
    expect(() =>
      buildSessionConfig({
        agent: "test-uuid",
      } as any),
    ).toThrow("Either apiKey or tokenFactory is required");
  });

  it("returns config with apiKey auth when apiKey provided", () => {
    const config = buildSessionConfig({
      apiKey: "dg-test",
      agent: "test-uuid",
    } as any);

    expect(config.auth).toEqual({ apiKey: "dg-test" });
  });

  it("returns config with tokenFactory auth when tokenFactory provided", () => {
    const factory = async () => "token";
    const config = buildSessionConfig({
      tokenFactory: factory,
      agent: "test-uuid",
    } as any);

    expect(config.auth).toEqual({ tokenFactory: factory });
  });

  it("sets default audio input encoding to linear16 at 16kHz", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "test-uuid",
    } as any);

    expect(config.audio?.input).toEqual({
      encoding: "linear16",
      sampleRate: 16_000,
    });
  });

  it("sets audio output sample rate from playerSampleRate config", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "test-uuid",
      playerSampleRate: 48_000,
    } as any);

    expect(config.audio?.output?.sampleRate).toBe(48_000);
  });

  it("defaults output sample rate to 24_000", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "test-uuid",
    } as any);

    expect(config.audio?.output?.sampleRate).toBe(24_000);
  });

  it("passes agent config through", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "my-agent-uuid",
    } as any);

    expect(config.agent).toBe("my-agent-uuid");
  });
});
