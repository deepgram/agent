# @deepgram/agent

Core SDK for the [Deepgram Voice Agent API](https://developers.deepgram.com/docs/voice-agent). Manages the WebSocket session, microphone capture, and audio playback with volume/frequency analysis.

## Install

```bash
bun add @deepgram/agent
```

## Quick Start

```ts
import { AgentSession, AgentMicrophone, AgentPlayer } from "@deepgram/agent";

const session = new AgentSession({
  auth: { tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()) },
  agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
});

const player = new AgentPlayer();
session.on("audio", (chunk) => player.queue(chunk));
session.on("conversation-text", (msg) => {
  console.log(`${msg.role}: ${msg.content}`);
});

const mic = new AgentMicrophone((data) => session.sendAudio(data));

await session.connect();
await mic.start();

// Later:
// mic.stop();
// session.disconnect();
// player.dispose();
```

## Authentication

Two auth modes via `AgentSessionConfig.auth`:

```ts
// Server-side: raw API key
{ apiKey: "your-deepgram-api-key" }

// Browser-safe: token factory (recommended)
{ tokenFactory: () => fetch('/api/token').then(r => r.text()) }
```

The token factory is called before every connection and reconnection attempt. Tokens are cached until invalidated by a reconnect, so the factory is not called on every audio frame.

The SDK authenticates using the `Sec-WebSocket-Protocol` header trick -- the browser `WebSocket` constructor doesn't support custom headers, so the token is passed as a subprotocol value. This is handled internally.

## AgentSession

Core WebSocket session. Wraps `@deepgram/sdk`'s agent connection with:
- Token factory auth (fresh credentials on every reconnect)
- Typed EventEmitter events
- Exponential-backoff reconnect with jitter
- Automatic KeepAlive pings
- Audio buffering until `SettingsApplied`

### Constructor

```ts
const session = new AgentSession(config: AgentSessionConfig);
```

### Config

```ts
interface AgentSessionConfig {
  auth: { apiKey: string } | { tokenFactory: () => Promise<string> };
  agent: AgentSettingsObject | string;  // inline config or pre-built agent UUID
  audio?: {
    input?: { encoding?: AudioEncoding; sampleRate?: number };   // default: linear16 @ 16kHz
    output?: { encoding?: OutputEncoding; sampleRate?: number }; // default: 24kHz
  };
  keepAliveInterval?: number;  // default: 10_000ms
  reconnect?: ReconnectConfig;
  experimental?: boolean;
  tags?: string[];
}
```

### Methods

| Method | Description |
|--------|-------------|
| `connect()` | Open WebSocket connection |
| `disconnect()` | Close connection (no reconnect) |
| `sendAudio(data: ArrayBuffer)` | Send PCM audio frame (queued until SettingsApplied) |
| `injectUserMessage(content)` | Send a text message as the user |
| `injectAgentMessage(message)` | Inject text as the agent |
| `updateSpeak(speak)` | Update TTS settings mid-session |
| `updateThink(think)` | Update LLM settings mid-session |
| `updatePrompt(prompt)` | Update system prompt mid-session |
| `sendFunctionCallResponse(id, name, content)` | Respond to a function call request |
| `getId()` | Returns session ID (available after Welcome) |

### Events

```ts
session.on("welcome", (msg) => {});
session.on("settings-applied", (msg) => {});
session.on("conversation-text", (msg) => {});
session.on("user-started-speaking", (msg) => {});
session.on("agent-thinking", (msg) => {});
session.on("agent-started-speaking", (msg) => {});
session.on("agent-audio-done", (msg) => {});
session.on("function-call-request", (msg) => {});
session.on("function-call-response", (msg) => {});
session.on("prompt-updated", (msg) => {});
session.on("speak-updated", (msg) => {});
session.on("think-updated", (msg) => {});
session.on("injection-refused", (msg) => {});
session.on("error", (msg) => {});
session.on("warning", (msg) => {});

// Binary audio from the agent
session.on("audio", (chunk: ArrayBuffer) => {});

// SDK lifecycle
session.on("connecting", () => {});
session.on("connected", () => {});
session.on("reconnecting", (attempt, delayMs) => {});
session.on("disconnected", (reason) => {});
session.on("sdk-error", (err) => {});
```

### State

```ts
session.state; // "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"
```

### Reconnect

Auto-reconnect is enabled by default with exponential backoff + jitter. Configure via `reconnect`:

```ts
{
  enabled: true,       // default
  maxAttempts: 8,      // default
  baseDelay: 500,      // ms, default
  maxDelay: 30_000,    // ms, default
  jitter: true,        // default: +/-20%
}
```

## AgentMicrophone

Captures PCM audio from the user's microphone via AudioWorklet.

### Usage

```ts
const mic = new AgentMicrophone(
  (data: ArrayBuffer) => session.sendAudio(data),
  {
    sampleRate: 16_000,         // default
    echoCancellation: true,     // default
    noiseSuppression: true,     // default
    autoGainControl: true,      // default
  },
);

await mic.start();
mic.mute();
mic.unmute();
mic.stop();
```

### Volume and Frequency Data

```ts
mic.getInputVolume();            // 0-1, RMS-based
mic.getInputByteFrequencyData(); // Uint8Array of frequency bin magnitudes (0-255)
```

### Events

```ts
mic.on("audio-frame", (data: ArrayBuffer) => {});
mic.on("error", (err: Error) => {});
```

## AgentPlayer

Decodes and plays PCM Int16 audio from the agent. Provides volume/frequency analysis for visualizations and supports barge-in via `interrupt()`.

### Usage

```ts
const player = new AgentPlayer({ sampleRate: 24_000 }); // default

// Queue audio from the session
session.on("audio", (chunk) => player.queue(chunk));

// Barge-in: interrupt when the user starts speaking
session.on("user-started-speaking", () => player.interrupt());

// Volume control
player.setVolume(0.8);
player.mute();
player.unmute();

// Cleanup
player.dispose();
```

### Volume and Frequency Data

```ts
player.getOutputVolume();            // 0-1, RMS-based
player.getOutputByteFrequencyData(); // Uint8Array of frequency bin magnitudes (0-255)
player.getRemainingPlaybackTime();   // seconds of queued audio remaining
```

## Exports

```ts
// Classes
export { AgentSession, AgentMicrophone, AgentPlayer };

// Types
export type {
  AgentState,
  AgentSessionConfig, AuthConfig, TokenFactory, ReconnectConfig,
  AgentSessionEvents,
  MicrophoneOptions,
  PlayerOptions,
  AgentSettingsObject, ThinkSettings, SpeakSettings,
  // Server messages
  WelcomeMessage, SettingsAppliedMessage, ConversationTextMessage,
  UserStartedSpeakingMessage, AgentThinkingMessage,
  FunctionCallRequestMessage, FunctionCallItem,
  AgentStartedSpeakingMessage, AgentAudioDoneMessage,
  AgentErrorMessage, AgentWarningMessage,
  InjectionRefusedMessage, ServerMessage,
};
```

## License

MIT
