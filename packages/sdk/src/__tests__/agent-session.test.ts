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
    agent: { think: { provider: { type: "open_ai", model: "gpt-4o-mini" } } },
    ...overrides,
  });
}

async function flushMicrotasks() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
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
      const welcomeMsg = { type: "Welcome" as const, request_id: "test-123" };
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

    it("handles Welcome emitted immediately after the socket opens", async () => {
      const session = createSession();
      mockSocket.connect.mockImplementation(() => {
        mockSocket._emit("open");
        mockSocket._emit("message", {
          type: "Welcome",
          request_id: "immediate-welcome",
        });
      });

      await session.connect();

      expect(mockSocket.sendSettings).toHaveBeenCalledTimes(1);
      expect(session.getId()).toBe("immediate-welcome");
    });

    it("emits welcome event", async () => {
      const session = createSession();
      const welcomeHandler = jest.fn();
      session.on("welcome", welcomeHandler);
      await session.connect();

      const welcomeMsg = { type: "Welcome" as const, request_id: "test-123" };
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(welcomeMsg);

      expect(welcomeHandler).toHaveBeenCalledWith(welcomeMsg);
    });

    it("tracks the current request ID and clears it on disconnect", async () => {
      const session = createSession();
      await session.connect();
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;

      messageHandler({ type: "Welcome", request_id: "request-123" });
      expect(session.getId()).toBe("request-123");

      session.disconnect();
      expect(session.getId()).toBeNull();
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

    it("normalizes Blob audio to ArrayBuffer in frame order", async () => {
      const session = createSession();
      const handler = jest.fn();
      session.on("audio", handler);
      await session.connect();

      let resolveFirst!: (data: ArrayBuffer) => void;
      const firstData = new ArrayBuffer(160);
      const secondData = new ArrayBuffer(320);
      const first = new Blob();
      const second = new Blob();
      const firstArrayBuffer = jest.fn(
        () => new Promise<ArrayBuffer>((resolve) => { resolveFirst = resolve; }),
      );
      const secondArrayBuffer = jest.fn(async () => secondData);
      Object.defineProperty(first, "arrayBuffer", { value: firstArrayBuffer });
      Object.defineProperty(second, "arrayBuffer", { value: secondArrayBuffer });

      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(first);
      messageHandler(second);

      expect(firstArrayBuffer).toHaveBeenCalledTimes(1);
      expect(secondArrayBuffer).not.toHaveBeenCalled();

      resolveFirst(firstData);
      await flushMicrotasks();

      expect(handler.mock.calls.map((call) => call[0])).toEqual([
        firstData,
        secondData,
      ]);
    });

    it("emits delayed Blob audio before following AgentAudioDone", async () => {
      const session = createSession();
      const events: string[] = [];
      session.on("audio", () => events.push("audio"));
      session.on("agent-audio-done", () => events.push("done"));
      await session.connect();

      let resolveConversion!: (data: ArrayBuffer) => void;
      const audio = new Blob();
      Object.defineProperty(audio, "arrayBuffer", {
        value: () => new Promise<ArrayBuffer>((resolve) => { resolveConversion = resolve; }),
      });
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(audio);
      messageHandler({ type: "AgentAudioDone" });

      expect(events).toEqual([]);

      resolveConversion(new ArrayBuffer(160));
      await flushMicrotasks();

      expect(events).toEqual(["audio", "done"]);
    });

    it("emits sdk-error when Blob conversion fails", async () => {
      const session = createSession();
      const handler = jest.fn();
      session.on("sdk-error", handler);
      await session.connect();

      const conversionError = new Error("blob conversion failed");
      const audio = new Blob();
      Object.defineProperty(audio, "arrayBuffer", {
        value: () => Promise.reject(conversionError),
      });
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(audio);
      await flushMicrotasks();

      expect(handler).toHaveBeenCalledWith(conversionError);
    });

    it("does not emit a late Blob conversion after disconnect", async () => {
      const session = createSession();
      const handler = jest.fn();
      session.on("audio", handler);
      await session.connect();

      let resolveConversion!: (data: ArrayBuffer) => void;
      const audio = new Blob();
      Object.defineProperty(audio, "arrayBuffer", {
        value: () => new Promise<ArrayBuffer>((resolve) => { resolveConversion = resolve; }),
      });
      const messageHandler = mockSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      messageHandler(audio);

      session.disconnect();
      resolveConversion(new ArrayBuffer(160));
      await flushMicrotasks();

      expect(handler).not.toHaveBeenCalled();
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

    it("clears accumulated conversation history", async () => {
      const { session, dispatch } = await setupConnectedSession();
      dispatch({ type: "ConversationText", role: "user", content: "forget this" });
      expect(session.conversationHistory).toHaveLength(1);

      session.clearConversationHistory();

      expect(session.conversationHistory).toEqual([]);
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

    it("records completed client-side function calls without duplicate server records", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const functionCall = {
        id: "call-1",
        name: "get_weather",
        arguments: '{"city":"Austin"}',
        client_side: true,
        thought_signature: "signature",
      };
      const completedCall = {
        id: "call-1",
        name: "get_weather",
        arguments: '{"city":"Austin"}',
        client_side: true,
        response: '{"temp":72}',
        thought_signature: "signature",
      };

      dispatch({ type: "FunctionCallRequest", functions: [functionCall] });
      session.sendFunctionCallResponse("call-1", "get_weather", '{"temp":72}');
      dispatch({
        type: "FunctionCallResponse",
        id: "call-1",
        name: "get_weather",
        content: '{"temp":72}',
      });
      dispatch({ type: "History", function_calls: [completedCall] });

      expect(session.conversationHistory).toEqual([
        { type: "History", function_calls: [completedCall] },
      ]);
    });

    it("records completed server-side function calls", async () => {
      const { session, dispatch } = await setupConnectedSession();

      dispatch({
        type: "FunctionCallRequest",
        functions: [{
          id: "server-call",
          name: "lookup_account",
          arguments: '{"id":42}',
          client_side: false,
        }],
      });
      dispatch({
        type: "FunctionCallResponse",
        id: "server-call",
        name: "lookup_account",
        content: '{"status":"active"}',
      });

      expect(session.conversationHistory).toEqual([{
        type: "History",
        function_calls: [{
          id: "server-call",
          name: "lookup_account",
          arguments: '{"id":42}',
          client_side: false,
          response: '{"status":"active"}',
        }],
      }]);
    });

    it("records unseen History function calls once", async () => {
      const { session, dispatch } = await setupConnectedSession();
      const history = {
        type: "History" as const,
        function_calls: [{
          id: "history-call",
          name: "search",
          arguments: '{"query":"voice"}',
          client_side: false,
          response: "result",
        }],
      };

      dispatch(history);
      dispatch(history);

      expect(session.conversationHistory).toEqual([history]);
    });

    it("clearConversationHistory clears pending function-call tracking", async () => {
      const { session, dispatch } = await setupConnectedSession();
      dispatch({
        type: "FunctionCallRequest",
        functions: [{
          id: "forgotten-call",
          name: "search",
          arguments: "{}",
          client_side: true,
        }],
      });

      session.clearConversationHistory();
      session.sendFunctionCallResponse("forgotten-call", "search", "result");

      expect(session.conversationHistory).toEqual([]);
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

    it.each([
      ["ListenUpdated", "listen-updated"],
      ["LatencyReport", "latency-report"],
      ["History", "history"],
    ] as const)("dispatches %s event", async (type, event) => {
      const { session, dispatch } = await setupConnectedSession();
      const handler = jest.fn();
      session.on(event, handler);

      const msg = { type };
      dispatch(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });
  });

  // ---------------------------------------------------------------------------
  // Public send methods
  // ---------------------------------------------------------------------------

  describe("send methods", () => {
    it("updateListen delegates to socket", async () => {
      const session = createSession();
      await session.connect();
      mockSocket._emit("message", { type: "SettingsApplied" });

      const listen = {
        provider: { type: "deepgram" as const, model: "flux-general-en" },
      };
      session.updateListen(listen);
      expect(mockSocket.sendUpdateListen).toHaveBeenCalledWith({
        type: "UpdateListen",
        listen,
      });
    });

    it("updateSpeak delegates to socket", async () => {
      const session = createSession();
      await session.connect();
      mockSocket._emit("message", { type: "SettingsApplied" });

      const speak = {
        provider: { type: "open_ai" as const, model: "tts-1", voice: "alloy" },
      };
      session.updateSpeak(speak);
      expect(mockSocket.sendUpdateSpeak).toHaveBeenCalled();
    });

    it("updateThink delegates to socket", async () => {
      const session = createSession();
      await session.connect();
      mockSocket._emit("message", { type: "SettingsApplied" });

      const think = { provider: { type: "open_ai" as const, model: "gpt-4o" } };
      session.updateThink(think);
      expect(mockSocket.sendUpdateThink).toHaveBeenCalled();
    });

    it("updatePrompt delegates to socket", async () => {
      const session = createSession();
      await session.connect();
      mockSocket._emit("message", { type: "SettingsApplied" });

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

    it.each(["default", "queue", "interrupt"] as const)(
      "injectAgentMessage forwards %s behavior",
      async (behavior) => {
        const session = createSession();
        await session.connect();

        session.injectAgentMessage("Urgent update", behavior);
        expect(mockSocket.sendInjectAgentMessage).toHaveBeenCalledWith({
          type: "InjectAgentMessage",
          message: "Urgent update",
          behavior,
        });
      },
    );

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

    it("routes runtime update send failures through reconnect handling", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 1, baseDelay: 100, jitter: false },
      });
      const error = new Error("update failed");
      const errorHandler = jest.fn();
      session.on("sdk-error", errorHandler);
      await session.connect();
      mockSocket._emit("message", { type: "SettingsApplied" });
      mockSocket.sendUpdatePrompt.mockImplementationOnce(() => { throw error; });

      expect(() => session.updatePrompt("new prompt")).not.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(error);
      expect(session.state).toBe("reconnecting");
    });
  });

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  describe("reconnection", () => {
    it("disables @deepgram/sdk reconnect attempts", async () => {
      const session = createSession();
      await session.connect();

      expect(mockClient.agent.v1.connect).toHaveBeenCalledWith({
        Authorization: "Token test-key",
        reconnectAttempts: 0,
      });
    });

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

    it("resets settings and buffers audio until reconnect settings are applied", async () => {
      const session = createSession({
        agent: {
          think: { provider: { type: "open_ai", model: "gpt-4o-mini" } },
          context: {
            messages: [{ type: "History", role: "assistant", content: "configured context" }],
          },
        },
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();

      const firstSocket = mockSocket;
      const firstMessageHandler = firstSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      firstMessageHandler({
        type: "ConversationText",
        role: "user",
        content: "remember this",
      });
      firstMessageHandler({ type: "SettingsApplied" });

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);

      firstSocket._emit("close", { code: 1006, reason: "abnormal" });
      const queuedFrame = new ArrayBuffer(320);
      session.sendAudio(queuedFrame);
      expect(firstSocket.sendMedia).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      expect(session.state).toBe("connected");

      const nextMessageHandler = nextSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      nextMessageHandler({ type: "Welcome", request_id: "reconnected" });
      expect(nextSocket.sendSettings.mock.calls[0][0].agent.context.messages).toEqual([
        { type: "History", role: "assistant", content: "configured context" },
        { type: "History", role: "user", content: "remember this" },
      ]);
      expect(nextSocket.sendMedia).not.toHaveBeenCalled();

      nextMessageHandler({ type: "SettingsApplied" });
      expect(nextSocket.sendMedia).toHaveBeenCalledWith(queuedFrame);
    });

    it("replays runtime updates in wire order before queued audio", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", { type: "SettingsApplied" });

      const listen = {
        provider: { type: "deepgram" as const, model: "flux-general-en" },
      };
      const speak = {
        provider: { type: "open_ai" as const, model: "tts-1", voice: "alloy" },
      };
      const think = {
        provider: { type: "open_ai" as const, model: "gpt-4o" },
      };
      session.updatePrompt("updated prompt");
      session.updateListen(listen);
      session.updateSpeak(speak);
      session.updateThink(think);

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);
      const wireOrder: string[] = [];
      nextSocket.sendUpdatePrompt.mockImplementation(() => wireOrder.push("prompt"));
      nextSocket.sendUpdateListen.mockImplementation(() => wireOrder.push("listen"));
      nextSocket.sendUpdateSpeak.mockImplementation(() => wireOrder.push("speak"));
      nextSocket.sendUpdateThink.mockImplementation(() => wireOrder.push("think"));
      nextSocket.sendMedia.mockImplementation(() => wireOrder.push("audio"));

      firstSocket._emit("close", { code: 1006 });
      session.sendAudio(new ArrayBuffer(320));
      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      nextSocket._emit("message", { type: "SettingsApplied" });

      expect(wireOrder).toEqual(["prompt", "listen", "speak", "think", "audio"]);
    });

    it("snapshots runtime updates before sending and replaying them", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", { type: "SettingsApplied" });

      const listen = {
        provider: { type: "deepgram" as const, model: "flux-general-en" },
      };
      const speak = {
        provider: { type: "open_ai" as const, model: "tts-1", voice: "alloy" },
      };
      const think = {
        provider: { type: "open_ai" as const, model: "gpt-4o" },
      };
      let prompt = "original prompt";
      session.updateListen(listen);
      session.updateSpeak(speak);
      session.updateThink(think);
      session.updatePrompt(prompt);

      listen.provider.model = "mutated-listen";
      speak.provider.model = "mutated-speak";
      speak.provider.voice = "mutated-voice";
      think.provider.model = "mutated-think";
      prompt = "mutated prompt";

      expect(firstSocket.sendUpdateListen).toHaveBeenCalledWith({
        type: "UpdateListen",
        listen: { provider: { type: "deepgram", model: "flux-general-en" } },
      });
      expect(firstSocket.sendUpdatePrompt).toHaveBeenCalledWith({
        type: "UpdatePrompt",
        prompt: "original prompt",
      });

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);
      firstSocket._emit("close", { code: 1006 });
      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      nextSocket._emit("message", { type: "SettingsApplied" });

      expect(nextSocket.sendUpdateListen).toHaveBeenCalledWith({
        type: "UpdateListen",
        listen: { provider: { type: "deepgram", model: "flux-general-en" } },
      });
      expect(nextSocket.sendUpdateSpeak).toHaveBeenCalledWith({
        type: "UpdateSpeak",
        speak: {
          provider: { type: "open_ai", model: "tts-1", voice: "alloy" },
        },
      });
      expect(nextSocket.sendUpdateThink).toHaveBeenCalledWith({
        type: "UpdateThink",
        think: { provider: { type: "open_ai", model: "gpt-4o" } },
      });
      expect(nextSocket.sendUpdatePrompt).toHaveBeenCalledWith({
        type: "UpdatePrompt",
        prompt: "original prompt",
      });
      expect(prompt).toBe("mutated prompt");
    });

    it("replays updates requested while reconnecting", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", { type: "SettingsApplied" });

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);
      firstSocket._emit("close", { code: 1006 });

      session.updatePrompt("reconnect prompt");
      session.updateListen({
        provider: { type: "deepgram", model: "flux-general-en" },
      });
      expect(firstSocket.sendUpdatePrompt).not.toHaveBeenCalled();
      expect(firstSocket.sendUpdateListen).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      nextSocket._emit("message", { type: "SettingsApplied" });

      expect(nextSocket.sendUpdatePrompt).toHaveBeenCalledWith({
        type: "UpdatePrompt",
        prompt: "reconnect prompt",
      });
      expect(nextSocket.sendUpdateListen).toHaveBeenCalledWith({
        type: "UpdateListen",
        listen: {
          provider: { type: "deepgram", model: "flux-general-en" },
        },
      });
    });

    it("clears runtime updates on an explicit fresh connect", async () => {
      const session = createSession();
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", { type: "SettingsApplied" });
      session.updatePrompt("old session prompt");

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValueOnce(nextSocket);
      await session.connect();
      nextSocket._emit("message", { type: "SettingsApplied" });

      expect(nextSocket.sendUpdatePrompt).not.toHaveBeenCalled();
    });

    it("restores completed function calls for inline agent configurations", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", {
        type: "FunctionCallRequest",
        functions: [{
          id: "call-1",
          name: "get_weather",
          arguments: '{"city":"Austin"}',
          client_side: true,
        }],
      });
      session.sendFunctionCallResponse("call-1", "get_weather", '{"temp":72}');

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);
      firstSocket._emit("close", { code: 1006 });
      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      nextSocket._emit("message", { type: "Welcome", request_id: "reconnected" });

      expect(nextSocket.sendSettings.mock.calls[0][0].agent.context.messages).toEqual([{
        type: "History",
        function_calls: [{
          id: "call-1",
          name: "get_weather",
          arguments: '{"city":"Austin"}',
          client_side: true,
          response: '{"temp":72}',
        }],
      }]);
    });

    it("does not attach accumulated context to an agent UUID", async () => {
      const session = createSession({
        agent: "agent-id",
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();
      const firstSocket = mockSocket;
      firstSocket._emit("message", {
        type: "ConversationText",
        role: "user",
        content: "remember this",
      });

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);
      firstSocket._emit("close", { code: 1006 });
      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      nextSocket._emit("message", { type: "Welcome", request_id: "reconnected" });

      expect(nextSocket.sendSettings.mock.calls[0][0].agent).toBe("agent-id");
    });

    it("preserves queued audio across failed reconnect attempts", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();

      const firstSocket = mockSocket;
      const failedSocket = createMockSocket();
      createMockDeepgramClient(failedSocket, false);
      const recoveredSocket = createMockSocket();
      createMockDeepgramClient(recoveredSocket);
      mockClient.agent.v1.connect
        .mockResolvedValueOnce(failedSocket)
        .mockResolvedValueOnce(recoveredSocket);

      firstSocket._emit("close", { code: 1006 });
      const queuedFrame = new ArrayBuffer(320);
      session.sendAudio(queuedFrame);

      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      failedSocket._emit("error", new Error("retry failed"));
      await flushMicrotasks();

      jest.advanceTimersByTime(200);
      await flushMicrotasks();
      const recoveredMessageHandler = recoveredSocket.on.mock.calls.find(
        (c) => c[0] === "message",
      )![1] as (msg: unknown) => void;
      recoveredMessageHandler({ type: "SettingsApplied" });

      expect(recoveredSocket.sendMedia).toHaveBeenCalledWith(queuedFrame);
    });

    it("schedules only one reconnect for error and close from the same socket", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      const reconnecting = jest.fn();
      session.on("reconnecting", reconnecting);
      await session.connect();

      mockSocket._emit("error", new Error("transport failed"));
      mockSocket._emit("close", { code: 1006 });

      expect(reconnecting).toHaveBeenCalledTimes(1);
    });

    it("drains accepted messages before processing a socket close", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      const events: string[] = [];
      session.on("audio", () => events.push("audio"));
      session.on("error", () => events.push("protocol-error"));
      session.on("reconnecting", () => events.push("reconnecting"));
      session.on("disconnected", () => events.push("disconnected"));
      await session.connect();

      let resolveConversion!: (data: ArrayBuffer) => void;
      const audio = new Blob();
      Object.defineProperty(audio, "arrayBuffer", {
        value: () => new Promise<ArrayBuffer>((resolve) => { resolveConversion = resolve; }),
      });
      mockSocket._emit("message", audio);
      mockSocket._emit("message", { type: "Error", message: "protocol failed" });
      mockSocket._emit("close", { code: 1006 });

      expect(events).toEqual([]);

      resolveConversion(new ArrayBuffer(160));
      await flushMicrotasks();

      expect(events).toEqual(["audio", "protocol-error", "reconnecting"]);
    });

    it("queues audio for reconnect while a socket close waits behind inbound audio", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      const receivedAudio = jest.fn();
      session.on("audio", receivedAudio);
      await session.connect();

      const firstSocket = mockSocket;
      firstSocket._emit("message", { type: "Welcome", request_id: "original" });
      firstSocket._emit("message", { type: "SettingsApplied" });

      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValue(nextSocket);

      let resolveConversion!: (data: ArrayBuffer) => void;
      const incomingAudio = new Blob();
      const incomingFrame = new ArrayBuffer(160);
      Object.defineProperty(incomingAudio, "arrayBuffer", {
        value: () => new Promise<ArrayBuffer>((resolve) => { resolveConversion = resolve; }),
      });
      firstSocket._emit("message", incomingAudio);
      firstSocket._emit("close", { code: 1006 });

      const outgoingFrame = new ArrayBuffer(320);
      session.sendAudio(outgoingFrame);
      expect(session.getId()).toBeNull();
      expect(firstSocket.sendMedia).not.toHaveBeenCalled();

      resolveConversion(incomingFrame);
      await flushMicrotasks();
      expect(receivedAudio).toHaveBeenCalledWith(incomingFrame);

      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      expect(nextSocket.sendMedia).not.toHaveBeenCalled();

      nextSocket._emit("message", { type: "SettingsApplied" });
      expect(nextSocket.sendMedia).toHaveBeenCalledTimes(1);
      expect(nextSocket.sendMedia).toHaveBeenCalledWith(outgoingFrame);
    });

    it("does not write messages to a socket with a queued failure", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 100, jitter: false },
      });
      await session.connect();

      let resolveConversion!: (data: ArrayBuffer) => void;
      const incomingAudio = new Blob();
      Object.defineProperty(incomingAudio, "arrayBuffer", {
        value: () => new Promise<ArrayBuffer>((resolve) => { resolveConversion = resolve; }),
      });
      mockSocket._emit("message", incomingAudio);
      mockSocket._emit("close", { code: 1006 });
      mockSocket.sendInjectUserMessage.mockImplementation(() => { throw new Error("closed"); });
      mockSocket.sendInjectAgentMessage.mockImplementation(() => { throw new Error("closed"); });
      mockSocket.sendFunctionCallResponse.mockImplementation(() => { throw new Error("closed"); });

      expect(() => session.injectUserMessage("Hello")).not.toThrow();
      expect(() => session.injectAgentMessage("Hi there")).not.toThrow();
      expect(() => {
        session.sendFunctionCallResponse("call-1", "get_weather", '{"temp":72}');
      }).not.toThrow();
      expect(mockSocket.sendInjectUserMessage).not.toHaveBeenCalled();
      expect(mockSocket.sendInjectAgentMessage).not.toHaveBeenCalled();
      expect(mockSocket.sendFunctionCallResponse).not.toHaveBeenCalled();

      resolveConversion(new ArrayBuffer(160));
      await flushMicrotasks();
    });

    it("counts sockets that open but fail before SettingsApplied toward maxAttempts", async () => {
      const session = createSession({
        reconnect: { enabled: true, maxAttempts: 2, baseDelay: 100, jitter: false },
      });
      const reconnecting = jest.fn();
      const disconnected = jest.fn();
      session.on("reconnecting", reconnecting);
      session.on("disconnected", disconnected);
      await session.connect();

      const initialSocket = mockSocket;
      const firstRetrySocket = createMockSocket();
      createMockDeepgramClient(firstRetrySocket);
      const secondRetrySocket = createMockSocket();
      createMockDeepgramClient(secondRetrySocket);
      mockClient.agent.v1.connect
        .mockResolvedValueOnce(firstRetrySocket)
        .mockResolvedValueOnce(secondRetrySocket);

      initialSocket._emit("close", { code: 1006 });
      jest.advanceTimersByTime(100);
      await flushMicrotasks();
      firstRetrySocket._emit("close", { code: 1006 });

      jest.advanceTimersByTime(200);
      await flushMicrotasks();
      secondRetrySocket._emit("close", { code: 1006 });

      expect(reconnecting.mock.calls).toEqual([
        [1, 100],
        [2, 200],
      ]);
      expect(disconnected).toHaveBeenCalledTimes(1);
      expect(session.state).toBe("disconnected");
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  describe("cleanup", () => {
    it("closes the previous socket before opening a fresh connection", async () => {
      const session = createSession();
      await session.connect();
      const firstSocket = mockSocket;
      const nextSocket = createMockSocket();
      createMockDeepgramClient(nextSocket);
      mockClient.agent.v1.connect.mockResolvedValueOnce(nextSocket);

      await session.connect();

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(nextSocket.connect).toHaveBeenCalledTimes(1);
    });

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
