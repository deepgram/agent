import { describe, it, expect, mock } from "bun:test";

const hookMocks = {
  AgentProvider: ({ children }: any) => children,
  useAgentContext: () => ({}),
  useAgentState: () => ({ state: "idle", isActive: false, isConnecting: false, start: async () => {}, stop: () => {} }),
  useAgentConversation: () => ({ conversation: [], sendUserMessage: () => {}, clearConversation: () => {} }),
  useAgentMicrophone: () => ({ micActive: false, micMuted: false, setMicMuted: () => {}, toggle: () => {}, enabled: true, getInputVolume: () => 0 }),
  useAgentPlayer: () => ({ outputMuted: false, setOutputMuted: () => {}, toggle: () => {}, enabled: true, getOutputVolume: () => 0 }),
  useAgentSession: () => ({}),
  useAgentMode: () => ({ mode: "idle", isSpeaking: false, isListening: false }),
  useAgentControls: () => ({ start: async () => {}, stop: () => {}, sendUserMessage: () => {}, clearConversation: () => {}, setMicMuted: () => {}, setOutputMuted: () => {} }),
  useAgentClientTool: () => {},
};

const componentMocks = {
  AgentStatus: () => null,
  AgentConversation: () => null,
  AgentMessage: () => null,
  AgentTextInput: () => null,
  AgentMicrophoneButton: () => null,
  AgentSpeakerButton: () => null,
  AgentStartButton: () => null,
  Orb: () => null,
};

mock.module("@deepgram/react", () => hookMocks);
mock.module("@deepgram/ui", () => ({ ...hookMocks, ...componentMocks }));
mock.module("@deepgram/agents", () => ({}));

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
