import EventEmitter from "eventemitter3";
// DeepgramClient is CustomDeepgramClient — browser-compatible, handles
// Sec-WebSocket-Protocol auth and binary message handling via setupBinaryHandling().
import { DeepgramClient } from "@deepgram/sdk";
import type { AgentSessionConfig, ReconnectConfig } from "./types/config.js";
import type { AgentSessionEvents } from "./types/events.js";
import type {
  AgentMessageBehavior,
  AgentContextMessage,
  AgentV1SettingsPayload,
  FunctionCallItem,
  ListenSettings,
  ServerMessage,
  SpeakSettings,
  ThinkSettings,
} from "./types/messages.js";
import { CachingTokenFactory, resolveTokenFactory } from "./token/factory.js";
import { KeepAliveTimer } from "./connection/keepalive.js";

// Runtime type returned by client.agent.v1.connect() — actually WrappedAgentV1Socket
// but TypeScript sees the base V1Socket interface which has all the methods we need.
type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>["agent"]["v1"]["connect"]>>;
type RuntimeUpdate =
  | Parameters<V1Socket["sendUpdateListen"]>[0]
  | Parameters<V1Socket["sendUpdateThink"]>[0]
  | Parameters<V1Socket["sendUpdateSpeak"]>[0]
  | Parameters<V1Socket["sendUpdatePrompt"]>[0];
type IncomingSocketItem = {
  socket: V1Socket;
  generation: number;
  lifecycle: number;
} & (
  | { type: "message"; data: unknown }
  | { type: "failure"; reason: string; error?: Error }
);

const DEFAULT_KEEPALIVE_MS = 10_000;
const OPEN_TIMEOUT_MS = 10_000;
const DEFAULT_RECONNECT: Required<ReconnectConfig> = {
  enabled: true,
  maxAttempts: 8,
  baseDelay: 500,
  maxDelay: 30_000,
  jitter: true,
};

export type AgentState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

/**
 * Core Deepgram Voice Agent session.
 *
 * Wraps `@deepgram/sdk`'s `client.agent.v1.connect()` with:
 * - Token factory: called before every (re)connect for fresh credentials
 * - Typed EventEmitter surface (AgentSessionEvents)
 * - Exponential-backoff reconnect with jitter
 * - Automatic KeepAlive pings
 * - Audio buffering until SettingsApplied
 *
 * Key SDK insight: `client.agent.v1.connect()` returns a WrappedAgentV1Socket
 * with `startClosed: true` — `socket.connect()` must be called explicitly to
 * start the WebSocket. The wrapper also calls setupBinaryHandling() so
 * `socket.on("message", cb)` receives parsed JSON and binary audio Blobs.
 *
 * Browser audio I/O (microphone and playback) is provided separately by
 * AgentMicrophone and AgentPlayer.
 */
export class AgentSession extends EventEmitter<AgentSessionEvents> {
  private tokenFactory: CachingTokenFactory;
  private keepAlive: KeepAliveTimer;
  private socket: V1Socket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectionGeneration = 0;
  private lifecycleGeneration = 0;
  /** Audio frames queued before SettingsApplied; flushed once the agent is ready */
  private audioQueue: ArrayBuffer[] = [];
  private incomingMessageQueue: IncomingSocketItem[] = [];
  private processingIncomingMessages = false;
  private incomingMessageProcessingGeneration = 0;
  private socketFailureQueued: V1Socket | null = null;
  private runtimeUpdates: RuntimeUpdate[] = [];
  private settingsApplied = false;
  private sessionId: string | null = null;
  /** Conversation history used to restore inline agent configurations on reconnect. */
  conversationHistory: AgentContextMessage[] = [];
  private pendingFunctionCalls = new Map<string, FunctionCallItem>();
  private completedFunctionCallIds = new Set<string>();

  private _state: AgentState = "idle";

  get state(): AgentState {
    return this._state;
  }

  constructor(private config: AgentSessionConfig) {
    super();
    this.tokenFactory = new CachingTokenFactory(
      resolveTokenFactory(config.auth),
    );
    this.keepAlive = new KeepAliveTimer(
      config.keepAliveInterval ?? DEFAULT_KEEPALIVE_MS,
      () => {
        const socket = this.socket;
        if (this._canWriteToSocket(socket)) {
          this._writeToSocket(socket, () => {
            socket.sendKeepAlive({ type: "KeepAlive" });
          });
        }
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Public lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    this.intentionalClose = true;
    this._cleanup();
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.runtimeUpdates.length = 0;
    this.clearConversationHistory();
    await this._openConnection();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._cleanup();
    this._setState("disconnected");
    this.emit("disconnected", "user requested disconnect");
  }

  /** Clears context accumulated for future inline-agent reconnects. */
  clearConversationHistory(): void {
    this.conversationHistory.length = 0;
    this.pendingFunctionCalls.clear();
    this.completedFunctionCallIds.clear();
  }

  // ---------------------------------------------------------------------------
  // Public send helpers
  // ---------------------------------------------------------------------------

  sendAudio(data: ArrayBuffer): void {
    const socket = this.socket;
    if (!this.settingsApplied || !this._canWriteToSocket(socket)) {
      this.audioQueue.push(data);
      return;
    }
    if (!this._writeToSocket(socket, () => {
      socket.sendMedia(data);
    })) {
      this.audioQueue.push(data);
    }
  }

  updateListen(listen: ListenSettings): void {
    this._recordRuntimeUpdate({ type: "UpdateListen", listen });
  }

  updateSpeak(speak: SpeakSettings | SpeakSettings[]): void {
    this._recordRuntimeUpdate({ type: "UpdateSpeak", speak });
  }

  updateThink(think: ThinkSettings | ThinkSettings[]): void {
    this._recordRuntimeUpdate({ type: "UpdateThink", think });
  }

  updatePrompt(prompt: string): void {
    this._recordRuntimeUpdate({ type: "UpdatePrompt", prompt });
  }

  injectUserMessage(content: string): void {
    const socket = this.socket;
    if (!this._canWriteToSocket(socket)) return;
    this._writeToSocket(socket, () => {
      socket.sendInjectUserMessage({ type: "InjectUserMessage", content });
    });
  }

  injectAgentMessage(message: string, behavior?: AgentMessageBehavior): void {
    const socket = this.socket;
    if (!this._canWriteToSocket(socket)) return;
    this._writeToSocket(socket, () => {
      socket.sendInjectAgentMessage({
        type: "InjectAgentMessage",
        message,
        ...(behavior === undefined ? {} : { behavior }),
      });
    });
  }

  sendFunctionCallResponse(id: string | undefined, name: string, content: string): void {
    this._recordFunctionCallResponse(id, name, content);
    const socket = this.socket;
    if (!this._canWriteToSocket(socket)) return;
    this._writeToSocket(socket, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.sendFunctionCallResponse({ type: "FunctionCallResponse", id, name, content } as any);
    });
  }

  /**
   * Returns the request ID assigned by the server (available after Welcome).
   * Returns null if not yet connected.
   */
  getId(): string | null {
    return this.sessionId;
  }

  // ---------------------------------------------------------------------------
  // Internal: connection
  // ---------------------------------------------------------------------------

  private async _openConnection(): Promise<void> {
    const generation = ++this.connectionGeneration;
    let socket: V1Socket | null = null;
    this.socketFailureQueued = null;
    this.settingsApplied = false;
    this.keepAlive.stop();
    this._setState("connecting");

    try {
      this.tokenFactory.invalidate();
      const token = await this.tokenFactory.get();
      if (generation !== this.connectionGeneration || this.intentionalClose) return;

      // Build client with the right auth scheme:
      // - Custom URL (proxy like dx-api): always Bearer
      // - tokenFactory → Bearer token (from /v1/auth/grant)
      // - apiKey        → raw API key → Token header
      // CustomDeepgramClient converts these to Sec-WebSocket-Protocol in browsers.
      const isBearer = !!this.config.url || "tokenFactory" in this.config.auth;
      const clientOpts = this.config.url ? { baseUrl: this.config.url } : {};
      const client = isBearer
        ? new DeepgramClient({ accessToken: token, ...clientOpts })
        : new DeepgramClient({ apiKey: token });
      const authorization = isBearer ? `Bearer ${token}` : `Token ${token}`;

      // Returns a WrappedAgentV1Socket with startClosed:true — NOT yet connected.
      // Disable transport retries; AgentSession owns reconnect so it can refresh
      // auth and restore inline Settings/context before queued audio resumes.
      socket = await client.agent.v1.connect({
        Authorization: authorization,
        reconnectAttempts: 0,
      });

      if (generation !== this.connectionGeneration || this.intentionalClose) {
        socket.close();
        return;
      }
      const connectingSocket = socket;

      this.socket = connectingSocket;
      const opened = this._bindSocketEvents(connectingSocket, generation);
      connectingSocket.connect();
      await opened;

      if (generation !== this.connectionGeneration || connectingSocket !== this.socket) return;
      this._setState("connected");

    } catch (err) {
      if (socket && this.socket === socket) this.socket = null;
      if (socket) {
        try { socket.close(); } catch { /* ignore */ }
      }
      if (generation !== this.connectionGeneration || this.intentionalClose) return;
      this._onConnectionError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private _buildSettingsPayload(): AgentV1SettingsPayload {
    const inputCfg = this.config.audio?.input;
    const outputCfg = this.config.audio?.output;

    const payload: AgentV1SettingsPayload = {
      type: "Settings",
      experimental: this.config.experimental,
      tags: this.config.tags,
      audio: {
        input: {
          encoding: inputCfg?.encoding ?? "linear16",
          sample_rate: inputCfg?.sampleRate ?? 16_000,
        },
      },
      // SDK types only cover the object form, but the API also accepts a UUID string.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agent: (() => {
        const agent = this.config.agent as any;
        if (typeof agent === "string" || this.conversationHistory.length === 0) return agent;
        // There is conversation history — pass it as context and strip greeting
        // so the server has context but doesn't replay the opening message.
        return {
          ...agent,
          greeting: undefined,
          context: {
            ...agent.context,
            messages: [
              ...(agent.context?.messages ?? []),
              ...this.conversationHistory,
            ],
          },
        };
      })(),
    };

    if (outputCfg) {
      payload.audio.output = {
        encoding: outputCfg.encoding,
        sample_rate: outputCfg.sampleRate,
      };
    }

    return payload;
  }

  private _bindSocketEvents(socket: V1Socket, generation: number): Promise<void> {
    let opened = false;
    let timer: ReturnType<typeof setTimeout>;

    const openPromise = new Promise<void>((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`open timeout after ${OPEN_TIMEOUT_MS}ms`)),
        OPEN_TIMEOUT_MS,
      );
      socket.on("open", () => {
        opened = true;
        clearTimeout(timer);
        resolve();
      });

      socket.on("close", (event: { code: number; reason?: string }) => {
        const reason = `socket closed: ${event.code} ${event.reason ?? ""}`;
        if (!opened) {
          clearTimeout(timer);
          reject(new Error(reason));
          return;
        }
        this._queueSocketFailure(socket, generation, reason);
      });

      socket.on("error", (err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (!opened) {
          clearTimeout(timer);
          reject(error);
          return;
        }
        this._queueSocketFailure(socket, generation, error.message, error);
      });
    });

    // WrappedAgentV1Socket.setupBinaryHandling() already replaces the base
    // handleMessage with a binary-aware handler. SDK 5.9 normalizes binary
    // payloads to Blob at runtime even though V1Socket.Response omits Blob.
    socket.on("message", (msg) => {
      if (socket !== this.socket || generation !== this.connectionGeneration) return;
      this._queueIncomingMessage(msg, socket, generation);
    });

    return openPromise;
  }

  private _queueIncomingMessage(
    data: unknown,
    socket: V1Socket,
    generation: number,
  ): void {
    this.incomingMessageQueue.push({
      type: "message",
      data,
      socket,
      generation,
      lifecycle: this.lifecycleGeneration,
    });
    void this._drainIncomingMessages();
  }

  private _queueSocketFailure(
    socket: V1Socket,
    generation: number,
    reason: string,
    error?: Error,
  ): void {
    if (
      this.intentionalClose ||
      socket !== this.socket ||
      generation !== this.connectionGeneration ||
      this.socketFailureQueued === socket
    ) {
      return;
    }

    this.socketFailureQueued = socket;
    this.settingsApplied = false;
    this.sessionId = null;
    this.keepAlive.stop();
    this.incomingMessageQueue.push({
      type: "failure",
      reason,
      error,
      socket,
      generation,
      lifecycle: this.lifecycleGeneration,
    });
    void this._drainIncomingMessages();
  }

  private async _drainIncomingMessages(): Promise<void> {
    if (this.processingIncomingMessages) return;
    this.processingIncomingMessages = true;
    const processingGeneration = this.incomingMessageProcessingGeneration;

    try {
      while (
        processingGeneration === this.incomingMessageProcessingGeneration &&
        this.incomingMessageQueue.length > 0
      ) {
        const item = this.incomingMessageQueue.shift()!;
        const { socket, generation, lifecycle } = item;
        if (
          generation !== this.connectionGeneration ||
          socket !== this.socket ||
          this.intentionalClose
        ) {
          continue;
        }

        if (item.type === "failure") {
          if (this.socketFailureQueued === socket) {
            this.socketFailureQueued = null;
          }
          this._handleSocketFailure(socket, item.reason, item.error);
          return;
        }

        const { data } = item;
        if (
          data instanceof ArrayBuffer ||
          (typeof Blob !== "undefined" && data instanceof Blob)
        ) {
          try {
            const chunk = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
            if (
              generation === this.connectionGeneration &&
              socket === this.socket &&
              !this.intentionalClose
            ) {
              this.emit("audio", chunk);
            }
          } catch (err) {
            if (lifecycle === this.lifecycleGeneration && !this.intentionalClose) {
              this.emit("sdk-error", err instanceof Error ? err : new Error(String(err)));
            }
          }
        } else {
          if (
            generation === this.connectionGeneration &&
            socket === this.socket &&
            !this.intentionalClose
          ) {
            this._dispatchMessage(data as ServerMessage, socket);
          }
        }
      }
    } finally {
      if (processingGeneration === this.incomingMessageProcessingGeneration) {
        this.processingIncomingMessages = false;
      }
    }
  }

  private _recordRuntimeUpdate(update: RuntimeUpdate): void {
    const snapshot = JSON.parse(JSON.stringify(update)) as RuntimeUpdate;
    const existing = this.runtimeUpdates.findIndex(
      (recorded) => recorded.type === snapshot.type,
    );
    if (existing !== -1) this.runtimeUpdates.splice(existing, 1);
    this.runtimeUpdates.push(snapshot);
    const socket = this.socket;
    if (this.settingsApplied && this._canWriteToSocket(socket)) {
      this._sendRuntimeUpdate(socket, snapshot);
    }
  }

  private _canWriteToSocket(socket: V1Socket | null): socket is V1Socket {
    return socket !== null && socket === this.socket && socket !== this.socketFailureQueued;
  }

  private _writeToSocket(socket: V1Socket, write: () => void): boolean {
    try {
      write();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._queueSocketFailure(
        socket,
        this.connectionGeneration,
        error.message,
        error,
      );
      return false;
    }
  }

  private _sendRuntimeUpdate(socket: V1Socket, update: RuntimeUpdate): boolean {
    return this._writeToSocket(socket, () => {
      switch (update.type) {
        case "UpdateListen":
          socket.sendUpdateListen(update);
          break;
        case "UpdateThink":
          socket.sendUpdateThink(update);
          break;
        case "UpdateSpeak":
          socket.sendUpdateSpeak(update);
          break;
        case "UpdatePrompt":
          socket.sendUpdatePrompt(update);
          break;
      }
    });
  }

  private _replayRuntimeUpdates(socket: V1Socket): boolean {
    for (const update of this.runtimeUpdates) {
      if (!this._sendRuntimeUpdate(socket, update)) return false;
    }
    return true;
  }

  private _recordFunctionCallResponse(
    id: string | undefined,
    name: string,
    response: string,
  ): void {
    const request = id
      ? this.pendingFunctionCalls.get(id)
      : this._findPendingFunctionCall(name);
    if (!request || this.completedFunctionCallIds.has(request.id)) return;

    this.completedFunctionCallIds.add(request.id);
    this.pendingFunctionCalls.delete(request.id);
    this.conversationHistory.push({
      type: "History",
      function_calls: [{
        id: request.id,
        name: request.name,
        client_side: request.client_side,
        arguments: request.arguments,
        response,
        ...(request.thought_signature === undefined
          ? {}
          : { thought_signature: request.thought_signature }),
      }],
    });
  }

  private _findPendingFunctionCall(name: string): FunctionCallItem | undefined {
    const matches = [...this.pendingFunctionCalls.values()].filter(
      (request) => request.name === name,
    );
    return matches.length === 1 ? matches[0] : undefined;
  }

  private _recordHistoryFunctionCalls(msg: ServerMessage): void {
    if (msg.type !== "History" || !("function_calls" in msg)) return;

    const functionCalls = msg.function_calls.filter((functionCall) => {
      if (this.completedFunctionCallIds.has(functionCall.id)) return false;
      this.completedFunctionCallIds.add(functionCall.id);
      this.pendingFunctionCalls.delete(functionCall.id);
      return true;
    });
    if (functionCalls.length > 0) {
      this.conversationHistory.push({ type: "History", function_calls: functionCalls });
    }
  }

  private _dispatchMessage(msg: ServerMessage, socket: V1Socket): void {
    switch (msg.type) {
      case "Welcome": {
        if (!this._canWriteToSocket(socket)) {
          this.emit("welcome", msg);
          break;
        }
        this.sessionId = msg.request_id ?? null;
        const settings = this._buildSettingsPayload();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.sendSettings(settings as any);
        this.emit("welcome", msg);
        break;
      }
      case "SettingsApplied":
        if (!this._canWriteToSocket(socket)) {
          this.emit("settings-applied", msg);
          break;
        }
        this.settingsApplied = true;
        this.reconnectAttempts = 0;
        this.keepAlive.start();
        if (!this._replayRuntimeUpdates(socket)) return;
        for (let index = 0; index < this.audioQueue.length; index++) {
          try {
            socket.sendMedia(this.audioQueue[index]);
          } catch (err) {
            this.audioQueue = this.audioQueue.slice(index);
            const error = err instanceof Error ? err : new Error(String(err));
            this._handleSocketFailure(socket, error.message, error);
            return;
          }
        }
        this.audioQueue = [];
        this.emit("settings-applied", msg);
        break;
      case "ConversationText":
        this.conversationHistory.push({
          type: "History",
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
        this.emit("conversation-text", msg);
        break;
      case "UserStartedSpeaking":
        this.emit("user-started-speaking", msg);
        break;
      case "AgentThinking":
        this.emit("agent-thinking", msg);
        break;
      case "FunctionCallRequest":
        for (const functionCall of msg.functions) {
          if (!this.completedFunctionCallIds.has(functionCall.id)) {
            this.pendingFunctionCalls.set(functionCall.id, functionCall);
          }
        }
        this.emit("function-call-request", msg);
        break;
      case "AgentStartedSpeaking":
        this.emit("agent-started-speaking", msg);
        break;
      case "AgentAudioDone":
        this.emit("agent-audio-done", msg);
        break;
      case "PromptUpdated":
        this.emit("prompt-updated", msg);
        break;
      case "SpeakUpdated":
        this.emit("speak-updated", msg);
        break;
      case "ThinkUpdated":
        this.emit("think-updated", msg);
        break;
      case "ListenUpdated":
        this.emit("listen-updated", msg);
        break;
      case "LatencyReport":
        this.emit("latency-report", msg);
        break;
      case "History":
        this._recordHistoryFunctionCalls(msg);
        this.emit("history", msg);
        break;
      case "InjectionRefused":
        this.emit("injection-refused", msg);
        break;
      case "Error":
        this.emit("error", msg);
        break;
      case "Warning":
        this.emit("warning", msg);
        break;
      case "FunctionCallResponse":
        this._recordFunctionCallResponse(msg.id, msg.name, msg.content);
        this.emit("function-call-response", msg);
        break;
    }
  }

  private _onConnectionError(err: Error): void {
    this.settingsApplied = false;
    this.sessionId = null;
    this.keepAlive.stop();
    this.emit("sdk-error", err);
    this._scheduleReconnect(err.message);
  }

  private _handleSocketFailure(socket: V1Socket, reason: string, err?: Error): void {
    if (this.intentionalClose || socket !== this.socket) return;

    this.settingsApplied = false;
    this.sessionId = null;
    this.keepAlive.stop();
    this.socket = null;
    this.incomingMessageProcessingGeneration++;
    this.incomingMessageQueue = [];
    this.processingIncomingMessages = false;
    if (err) this.emit("sdk-error", err);
    try { socket.close(); } catch { /* ignore */ }
    this._scheduleReconnect(reason);
  }

  private _scheduleReconnect(reason: string): void {
    if (this.intentionalClose || this.reconnectTimer !== null) return;

    const cfg = { ...DEFAULT_RECONNECT, ...this.config.reconnect };
    if (!cfg.enabled || this.reconnectAttempts >= cfg.maxAttempts) {
      this._cleanup();
      this._setState("disconnected");
      this.emit("disconnected", reason);
      return;
    }

    this.reconnectAttempts++;
    const base = Math.min(
      cfg.baseDelay * 2 ** (this.reconnectAttempts - 1),
      cfg.maxDelay,
    );
    const delay = cfg.jitter ? base * (0.8 + Math.random() * 0.4) : base;

    this._setState("reconnecting");
    this.emit("reconnecting", this.reconnectAttempts, Math.round(delay));

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this._openConnection();
    }, delay);
  }

  private _cleanup(): void {
    this.connectionGeneration++;
    this.lifecycleGeneration++;
    this.settingsApplied = false;
    this.sessionId = null;
    this.audioQueue = [];
    this.incomingMessageQueue = [];
    this.socketFailureQueued = null;
    this.incomingMessageProcessingGeneration++;
    this.processingIncomingMessages = false;
    this.keepAlive.stop();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try { socket.close(); } catch { /* ignore */ }
    }
  }

  private _setState(next: AgentState): void {
    if (this._state === next) return;
    this._state = next;
    if (next === "connected") this.emit("connected");
    if (next === "connecting") this.emit("connecting");
  }
}
