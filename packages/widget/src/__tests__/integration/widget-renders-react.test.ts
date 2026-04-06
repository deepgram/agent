import { describe, it, expect, mock } from "bun:test";

// Track what config gets passed to AgentProvider
let capturedConfig: any = null;
let capturedProps: any = null;

const hookMocks = {
  AgentProvider: (props: any) => {
    capturedConfig = props.config;
    capturedProps = props;
    return null;
  },
  useAgentContext: () => ({}),
  useAgentState: () => ({ state: "idle", isActive: false, isConnecting: false, start: async () => {}, stop: () => {} }),
  useAgentConversation: () => ({ conversation: [], sendUserMessage: () => {}, clearConversation: () => {} }),
  useAgentMicrophone: () => ({ micActive: false, micMuted: false, setMicMuted: () => {}, toggle: () => {}, enabled: true }),
  useAgentPlayer: () => ({ outputMuted: false, setOutputMuted: () => {}, toggle: () => {}, enabled: true }),
  useAgentSession: () => ({}),
};

mock.module("@deepgram/agent-react", () => hookMocks);
mock.module("@deepgram/agent-react-ui", () => ({
  ...hookMocks,
  AgentStatus: () => null,
  AgentConversation: () => null,
  AgentTextInput: () => null,
  AgentMicrophoneButton: () => null,
  AgentSpeakerButton: () => null,
  AgentStartButton: () => null,
}));
mock.module("@deepgram/agent", () => ({}));

const { buildSessionConfig } = await import("../../widget.js");

describe("Integration: Widget → React config flow", () => {
  it("buildSessionConfig maps apiKey to auth.apiKey", () => {
    const config = buildSessionConfig({
      apiKey: "test-key-123",
      agent: "agent-uuid",
    } as any);

    expect(config.auth).toEqual({ apiKey: "test-key-123" });
  });

  it("buildSessionConfig maps tokenFactory to auth.tokenFactory", () => {
    const factory = async () => "tok";
    const config = buildSessionConfig({
      tokenFactory: factory,
      agent: "agent-uuid",
    } as any);

    expect(config.auth).toEqual({ tokenFactory: factory });
  });

  it("buildSessionConfig sets linear16 input at 16kHz by default", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "uuid",
    } as any);

    expect(config.audio?.input).toEqual({
      encoding: "linear16",
      sampleRate: 16_000,
    });
  });

  it("buildSessionConfig passes playerSampleRate to output config", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "uuid",
      playerSampleRate: 48_000,
    } as any);

    expect(config.audio?.output).toEqual({
      encoding: "linear16",
      sampleRate: 48_000,
    });
  });

  it("buildSessionConfig defaults output to 24kHz", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "uuid",
    } as any);

    expect(config.audio?.output?.sampleRate).toBe(24_000);
  });

  it("buildSessionConfig preserves agent UUID", () => {
    const config = buildSessionConfig({
      apiKey: "key",
      agent: "my-agent-uuid-here",
    } as any);

    expect(config.agent).toBe("my-agent-uuid-here");
  });
});
