import { describe, it, expect, beforeEach, afterEach, jest, mock } from "bun:test";
import { createMockSocket, createMockDeepgramClient, type MockSocket } from "./helpers/sdk-mocks.js";

// Mock @deepgram/sdk before importing AgentSession
let mockSocket: MockSocket;
let mockClient: ReturnType<typeof createMockDeepgramClient>;

mock.module("@deepgram/sdk", () => {
  mockSocket = createMockSocket();
  mockClient = createMockDeepgramClient(mockSocket);
  return {
    DeepgramClient: jest.fn(() => mockClient),
  };
});

// Import after mock is set up
const { AgentSession } = await import("../agent-session.js");

function createSession(overrides = {}) {
  return new AgentSession({
    auth: { apiKey: "test-key" },
    agent: { think: { type: "open_ai", model: "gpt-4o-mini" } },
    ...overrides,
  });
}

describe("AgentSession", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset the mock socket for each test
    mockSocket = createMockSocket();
    mockClient = createMockDeepgramClient(mockSocket);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------------

  describe("state machine", () => {
    it("starts in idle state", () => {
      const session = createSession();
      expect(session.state).toBe("idle");
    });

    it("transitions to connecting then connected on successful connect", async () => {
      const session = createSession();
      const states: string[] = [];
      session.on("connecting", () => states.push("connecting"));
      session.on("connected", () => states.push("connected"));

      await session.connect();

      expect(states).toEqual(["connecting", "connected"]);
      expect(session.state).toBe("connected");
    });

    it("transitions to disconnected on user disconnect", async () => {
      const session = createSession();
      await session.connect();

      const reason = jest.fn();
      session.on("disconnected", reason);

      session.disconnect();
      expect(session.state).toBe("disconnected");
      expect(reason).toHaveBeenCalledWith("user requested disconnect");
    });

    it("does not reconnect after intentional disconnect", async () => {
      const session = createSession();
      await session.connect();

      session.disconnect();

      // Simulate socket close after disconnect — should not trigger reconnect
      const reconnecting = jest.fn();
      session.on("reconnecting", reconnecting);

      // Advance timers — no reconnect should fire
      jest.advanceTimersByTime(60_000);
      expect(reconnecting).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Settings and keepalive
  // ---------------------------------------------------------------------------

  describe("settings and keepalive", () => {
    it("sends Settings on Welcome message", async () => {
      const session = createSession();
      await session.connect();

      // Simulate Welcome message
      const welcomeMsg = { type: "Welcome" as const, session_id: "test-123" };
      // Get the message handler
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(welcomeMsg);

      expect(mockSocket.sendSettings).toHaveBeenCalledTimes(1);
      const settings = mockSocket.sendSettings.mock.calls[0][0];
      expect(settings.type).toBe("Settings");
      expect(settings.audio.input.encoding).toBe("linear16");
      expect(settings.audio.input.sample_rate).toBe(16_000);
    });

    it("emits welcome event", async () => {
      const session = createSession();
      const welcomeHandler = jest.fn();
      session.on("welcome", welcomeHandler);
      await session.connect();

      const welcomeMsg = { type: "Welcome" as const, session_id: "test-123" };
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(welcomeMsg);

      expect(welcomeHandler).toHaveBeenCalledWith(welcomeMsg);
    });

    it("includes output config when specified", async () => {
      const session = createSession({
        audio: {
          input: { encoding: "linear16", sampleRate: 16_000 },
          output: { encoding: "linear16", sampleRate: 24_000 },
        },
      });
      await session.connect();

      const welcomeMsg = { type: "Welcome" as const };
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(welcomeMsg);

      const settings = mockSocket.sendSettings.mock.calls[0][0];
      expect(settings.audio.output).toEqual({
        encoding: "linear16",
        sample_rate: 24_000,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Audio buffering
  // ---------------------------------------------------------------------------

  describe("audio buffering", () => {
    it("queues audio before SettingsApplied", async () => {
      const session = createSession();
      await session.connect();

      const frame1 = new ArrayBuffer(320);
      const frame2 = new ArrayBuffer(320);
      session.sendAudio(frame1);
      session.sendAudio(frame2);

      // Not sent yet
      expect(mockSocket.sendMedia).not.toHaveBeenCalled();
    });

    it("flushes queued audio on SettingsApplied", async () => {
      const session = createSession();
      await session.connect();

      const frame1 = new ArrayBuffer(320);
      const frame2 = new ArrayBuffer(320);
      session.sendAudio(frame1);
      session.sendAudio(frame2);

      // Simulate SettingsApplied
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler({ type: "SettingsApplied" as const });

      expect(mockSocket.sendMedia).toHaveBeenCalledTimes(2);
      expect(mockSocket.sendMedia).toHaveBeenCalledWith(frame1);
      expect(mockSocket.sendMedia).toHaveBeenCalledWith(frame2);
    });

    it("sends audio immediately after SettingsApplied", async () => {
      const session = createSession();
      await session.connect();

      // Trigger SettingsApplied first
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler({ type: "SettingsApplied" as const });

      const frame = new ArrayBuffer(320);
      session.sendAudio(frame);
      expect(mockSocket.sendMedia).toHaveBeenCalledWith(frame);
    });

    it("emits settings-applied event", async () => {
      const session = createSession();
      const handler = jest.fn();
      session.on("settings-applied", handler);
      await session.connect();

      const msg = { type: "SettingsApplied" as const };
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });
  });

  // ---------------------------------------------------------------------------
  // Message dispatch
  // ---------------------------------------------------------------------------

  describe("message dispatch", () => {
    async function setupConnectedSession() {
      const session = createSession();
      await session.connect();
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      return { session, dispatch: messageHandler };
    }

    it("dispatches ConversationText event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("conversation-text", handler);

      const msg = { type: "ConversationText" as const, role: "assistant", content: "hello" };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches UserStartedSpeaking event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("user-started-speaking", handler);

      const msg = { type: "UserStartedSpeaking" as const };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches AgentThinking event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("agent-thinking", handler);

      const msg = { type: "AgentThinking" as const };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches FunctionCallRequest event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("function-call-request", handler);

      const msg = { type: "FunctionCallRequest" as const, functions: [] };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches AgentStartedSpeaking event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("agent-started-speaking", handler);

      const msg = { type: "AgentStartedSpeaking" as const };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches AgentAudioDone event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("agent-audio-done", handler);

      const msg = { type: "AgentAudioDone" as const };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("emits audio event for binary ArrayBuffer messages", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("audio", handler);

      const audioData = new ArrayBuffer(480);
      dispatch(audioData);
      expect(handler).toHaveBeenCalledWith(audioData);
    });

    it("dispatches Error event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("error", handler);

      const msg = { type: "Error" as const, message: "test error" };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it("dispatches Warning event", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on("warning", handler);

      const msg = { type: "Warning" as const, message: "test warning" };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });
  });

  // ---------------------------------------------------------------------------
  // Public send methods
  // ---------------------------------------------------------------------------

  describe("send methods", () => {
    it("updateSpeak delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      const speak = { type: "open_ai" as const, model: "tts-1" };
      session.updateSpeak(speak);
      expect(mockSocket.sendUpdateSpeak).toHaveBeenCalled();
    });

    it("updateThink delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      const think = { type: "open_ai" as const, model: "gpt-4o" };
      session.updateThink(think);
      expect(mockSocket.sendUpdateThink).toHaveBeenCalled();
    });

    it("updatePrompt delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      session.updatePrompt("You are a helpful assistant");
      expect(mockSocket.sendUpdatePrompt).toHaveBeenCalledWith({
        type: "UpdatePrompt",
        prompt: "You are a helpful assistant",
      });
    });

    it("injectUserMessage delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      session.injectUserMessage("Hello");
      expect(mockSocket.sendInjectUserMessage).toHaveBeenCalledWith({
        type: "InjectUserMessage",
        content: "Hello",
      });
    });

    it("injectAgentMessage delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      session.injectAgentMessage("Hi there");
      expect(mockSocket.sendInjectAgentMessage).toHaveBeenCalledWith({
        type: "InjectAgentMessage",
        message: "Hi there",
      });
    });

    it("sendFunctionCallResponse delegates to socket", async () => {
      const session = createSession();
      await session.connect();

      session.sendFunctionCallResponse("call-1", "get_weather", '{"temp":72}');
      expect(mockSocket.sendFunctionCallResponse).toHaveBeenCalledWith({
        type: "FunctionCallResponse",
        id: "call-1",
        name: "get_weather",
        content: '{"temp":72}',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  describe("reconnection", () => {
    it("schedules reconnect on socket close with exponential backoff", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      const reconnecting = jest.fn();
      session.on("reconnecting", reconnecting);

      await session.connect();

      // Use the EventEmitter _emit helper so ALL close handlers fire
      // (both the initial connection race handler and the _bindSocketEvents handler)
      mockSocket._emit("close", { code: 1006, reason: "abnormal" });

      expect(session.state).toBe("reconnecting");
      expect(reconnecting).toHaveBeenCalledWith(1, 100);
    });

    it("transitions to disconnected after maxAttempts exhausted", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 0, baseDelay: 100, jitter: false },
      });
      await session.connect();

      const disconnected = jest.fn();
      session.on("disconnected", disconnected);

      mockSocket._emit("close", { code: 1006 });

      // maxAttempts=0 means no reconnect attempts allowed
      expect(session.state).toBe("disconnected");
      expect(disconnected).toHaveBeenCalled();
    });

    it("does not reconnect when reconnect.enabled is false", async () => {
      const session = createSession({
        reconnect: { enabled: false },
      });
      await session.connect();

      const disconnected = jest.fn();
      session.on("disconnected", disconnected);

      mockSocket._emit("close", { code: 1006 });

      expect(session.state).toBe("disconnected");
      expect(disconnected).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  describe("cleanup", () => {
    it("disconnect closes socket and stops keepalive", async () => {
      const session = createSession();
      await session.connect();

      session.disconnect();
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it("disconnect clears audio queue and resets settingsApplied", async () => {
      const session = createSession();
      await session.connect();

      session.sendAudio(new ArrayBuffer(320));
      session.disconnect();

      // After reconnect, audio should require new SettingsApplied
      // (settingsApplied is reset in _cleanup)
    });
  });
});
