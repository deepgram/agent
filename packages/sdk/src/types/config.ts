import type { AgentSettingsObject, AudioEncoding, OutputEncoding } from "./messages.js";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * A function that returns a Deepgram API key (or short-lived token) on demand.
 * Called at initial connect and before every reconnect attempt, so tokens
 * can be rotated without re-creating the session.
 */
export type TokenFactory = () => Promise<string>;

export type AuthConfig =
  | { apiKey: string }
  | { tokenFactory: TokenFactory };

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export interface AudioInputConfig {
  encoding?: AudioEncoding;
  sampleRate?: number;
}

export interface AudioOutputConfig {
  encoding?: OutputEncoding;
  sampleRate?: number;
}

// ---------------------------------------------------------------------------
// Reconnect
// ---------------------------------------------------------------------------

export interface ReconnectConfig {
  /** Whether to auto-reconnect on unexpected disconnections. Default: true */
  enabled?: boolean;
  /** Max number of attempts before giving up. Default: 8 */
  maxAttempts?: number;
  /** Initial backoff delay in ms. Default: 500 */
  baseDelay?: number;
  /** Max backoff delay in ms. Default: 30_000 */
  maxDelay?: number;
  /** Add ±20% jitter to each delay. Default: true */
  jitter?: boolean;
}

// ---------------------------------------------------------------------------
// Session config
// ---------------------------------------------------------------------------

export interface AgentSessionConfig {
  auth: AuthConfig;

  /**
   * Agent configuration sent in the Settings message after connection.
   * Pass either a full settings object or a pre-built agent UUID.
   */
  agent: AgentSettingsObject | string;

  /**
   * Audio I/O configuration. Defaults to linear16 at 16kHz in, 24kHz out.
   */
  audio?: {
    input?: AudioInputConfig;
    output?: AudioOutputConfig;
  };

  /** Keep-alive ping interval in ms. Default: 10_000 */
  keepAliveInterval?: number;

  reconnect?: ReconnectConfig;

  /** Override the default agent WebSocket URL */
  url?: string;

  /** Include experimental features. Default: false */
  experimental?: boolean;

  /** Tags for usage reporting */
  tags?: string[];
}
