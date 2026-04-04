import EventEmitter from "eventemitter3";
// DeepgramClient is CustomDeepgramClient (browser-compatible WebSocket with Sec-WebSocket-Protocol auth)
import { DeepgramClient } from "@deepgram/sdk";
import type { AgentSessionConfig, ReconnectConfig } from "./types/config.js";
import type { AgentSessionEvents } from "./types/events.js";
import type {
  AgentV1SettingsPayload,
  ServerMessage,
  SpeakSettings,
  ThinkSettings,
} from "./types/messages.js";
import { CachingTokenFactory, resolveTokenFactory } from "./token/factory.js";
import { KeepAliveTimer } from "./connection/keepalive.js";

// Type alias for the V1Socket returned by client.agent.v1.connect()
type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>["agent"]["v1"]["connect"]>>;

const DEFAULT_KEEPALIVE_MS = 10_000;
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
 * Wraps `@deepgram/sdk`'s `client.agent.v1.connect()` (V1Socket) with:
 * - Token factory: `tokenFactory()` called before every (re)connect
 * - Binary audio dispatch: patches V1Socket's JSON-only message handler so
 *   ArrayBuffer frames are emitted as `audio` events
 * - Typed EventEmitter surface (AgentSessionEvents)
 * - Exponential-backoff reconnect with jitter
 * - Automatic KeepAlive pings
 *
 * Browser audio I/O (microphone, playback, VAD) is provided separately by
 * AgentMicrophone and AgentPlayer.
 */
export class AgentSession extends EventEmitter<AgentSessionEvents> {
  private tokenFactory: CachingTokenFactory;
  private keepAlive: KeepAliveTimer;
  private socket: V1Socket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  /** Audio frames queued before SettingsApplied; flushed once the agent is ready */
  private audioQueue: ArrayBuffer[] = [];
  private settingsApplied = false;

  private _state: AgentState = "idle";

  get state(): AgentState {
    return this._state;
  }

  constructor(private readonly config: AgentSessionConfig) {
    super();
    this.tokenFactory = new CachingTokenFactory(
      resolveTokenFactory(config.auth),
    );
    this.keepAlive = new KeepAliveTimer(
      config.keepAliveInterval ?? DEFAULT_KEEPALIVE_MS,
      () => this.socket?.sendKeepAlive({ type: "KeepAlive" }),
    );
  }

  // ---------------------------------------------------------------------------
  // Public lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    await this._openConnection();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._cleanup("user requested disconnect");
    this._setState("disconnected");
  }

  // ---------------------------------------------------------------------------
  // Public send helpers (mirror the AsyncAPI spec operations)
  // ---------------------------------------------------------------------------

  sendAudio(data: ArrayBuffer): void {
    if (!this.settingsApplied) {
      this.audioQueue.push(data);
      return;
    }
    this.socket?.sendMedia(data);
  }

  updateSpeak(speak: SpeakSettings | SpeakSettings[]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.sendUpdateSpeak({ type: "UpdateSpeak", speak } as any);
  }

  updateThink(think: ThinkSettings | ThinkSettings[]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.sendUpdateThink({ type: "UpdateThink", think } as any);
  }

  updatePrompt(prompt: string): void {
    this.socket?.sendUpdatePrompt({ type: "UpdatePrompt", prompt });
  }

  injectUserMessage(content: string): void {
    this.socket?.sendInjectUserMessage({ type: "InjectUserMessage", content });
  }

  injectAgentMessage(message: string): void {
    this.socket?.sendInjectAgentMessage({ type: "InjectAgentMessage", message });
  }

  sendFunctionCallResponse(id: string | undefined, name: string, content: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.sendFunctionCallResponse({ type: "FunctionCallResponse", id, name, content } as any);
  }

  // ---------------------------------------------------------------------------
  // Internal: connection management
  // ---------------------------------------------------------------------------

  private async _openConnection(): Promise<void> {
    this._setState("connecting");
    console.log("[dg-agent] _openConnection attempt", this.reconnectAttempts + 1);

    try {
      this.tokenFactory.invalidate();
      const token = await this.tokenFactory.get();
      console.log("[dg-agent] token obtained, length:", token.length);

      // Pass apiKey so the SDK's HeaderAuthProvider is satisfied in browser
      // environments where process.env is not available. The Authorization
      // header on connect() still takes precedence for the WebSocket upgrade.
      const client = new DeepgramClient({ apiKey: token });
      const socket = await client.agent.v1.connect({
        Authorization: `Token ${token}`,
        reconnectAttempts: 0,
      });
      console.log("[dg-agent] socket created, waiting for open...");

      // waitForOpen() only resolves on 'open' or rejects on 'error' — it hangs
      // if the socket closes without an error event (e.g. server closes mid-
      // handshake with a close frame). Race it against a close listener so we
      // always get a rejection we can handle.
      const OPEN_TIMEOUT_MS = 10_000;
      await Promise.race([
        socket.waitForOpen(),
        new Promise<never>((_, reject) => {
          // SDK's waitForOpen() only handles 'open' and 'error' — not 'close'.
          // If the socket closes without an error (e.g. server rejects mid-
          // handshake), the promise would hang. Register our own close handler
          // AND a hard timeout so we always get a rejection.
          socket.socket.addEventListener("close", (e: { code: number; reason?: string }) => {
            reject(new Error(`socket closed before open: code ${e.code} ${e.reason ?? ""}`));
          });
          setTimeout(() => reject(new Error(`waitForOpen timed out after ${OPEN_TIMEOUT_MS}ms`)), OPEN_TIMEOUT_MS);
        }),
      ]);
      console.log("[dg-agent] socket open, binding events");

      this.socket = socket;
      this._bindSocketEvents(socket);
    } catch (err) {
      console.log("[dg-agent] _openConnection error:", String(err), err);
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
      agent: this.config.agent as any,
    };

    if (outputCfg) {
      payload.audio.output = {
        encoding: outputCfg.encoding,
        sample_rate: outputCfg.sampleRate,
      };
    }

    return payload;
  }

  private _bindSocketEvents(socket: V1Socket): void {
    // V1Socket.handleMessage calls JSON.parse() on every message, which will
    // throw SyntaxError for binary audio frames (ArrayBuffer). We remove the
    // SDK's registered listener and replace it with our own that correctly
    // handles both text (JSON) and binary (audio) messages.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.socket.removeEventListener("message", (socket as any).handleMessage);

    socket.socket.addEventListener("message", (event: { data: unknown }) => {
      if (event.data instanceof ArrayBuffer) {
        this.emit("audio", event.data);
      } else if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          console.log("[dg-agent] ←", msg.type, msg);
          this._dispatchMessage(msg, socket);
        } catch {
          // Malformed JSON — ignore
        }
      }
    });

    // open / close / error — V1Socket handles these correctly
    socket.on("open", () => {
      this.reconnectAttempts = 0;
      this._setState("connected");
    });

    socket.on("close", (event) => {
      console.log("[dg-agent] socket closed", event.code, event.reason ?? "");
      this.keepAlive.stop();
      if (!this.intentionalClose) {
        this._scheduleReconnect(`socket closed: ${event.code} ${event.reason ?? ""}`);
      }
    });

    socket.on("error", (err) => {
      this.emit("sdk-error", err);
    });
  }

  private _dispatchMessage(msg: ServerMessage, socket: V1Socket): void {
    switch (msg.type) {
      case "Welcome": {
        const settings = this._buildSettingsPayload();
        console.log("[dg-agent] → Settings", JSON.stringify(settings, null, 2));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.sendSettings(settings as any);
        this.emit("welcome", msg);
        break;
      }
      case "SettingsApplied":
        this.settingsApplied = true;
        this.keepAlive.start();
        // Flush any audio frames that arrived before the agent was ready
        for (const frame of this.audioQueue) {
          socket.sendMedia(frame);
        }
        this.audioQueue = [];
        this.emit("settings-applied", msg);
        break;
      case "ConversationText":
        this.emit("conversation-text", msg);
        break;
      case "UserStartedSpeaking":
        this.emit("user-started-speaking", msg);
        break;
      case "AgentThinking":
        this.emit("agent-thinking", msg);
        break;
      case "FunctionCallRequest":
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
        this.emit("function-call-response", msg);
        break;
    }
  }

  private _onConnectionError(err: Error): void {
    this.emit("sdk-error", err);
    this._scheduleReconnect(err.message);
  }

  private _scheduleReconnect(reason: string): void {
    const cfg = { ...DEFAULT_RECONNECT, ...this.config.reconnect };
    if (!cfg.enabled || this.reconnectAttempts >= cfg.maxAttempts) {
      this._cleanup(reason);
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
      await this._openConnection();
    }, delay);
  }

  private _cleanup(reason: string): void {
    void reason;
    this.settingsApplied = false;
    this.audioQueue = [];
    this.keepAlive.stop();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch { /* ignore */ }
      this.socket = null;
    }
  }

  private _setState(next: AgentState): void {
    if (this._state === next) return;
    this._state = next;
    if (next === "connected") this.emit("connected");
    if (next === "connecting") this.emit("connecting");
  }
}
