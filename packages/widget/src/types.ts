import type {
  AgentSettingsObject,
  MicrophoneOptions,
} from "@deepgram/voice-agent";

export type TokenFactory = () => Promise<string>;

export type WidgetLayout = "sidebar" | "inline" | "floating";

export interface WidgetTheme {
  /** Brand/accent colour. Default: #13EF93 */
  primary?: string;
  /** Panel background. Default: #101014 */
  background?: string;
  /** Text colour. Default: #FFFFFF */
  text?: string;
  /** Border radius for the panel. Default: 16px */
  radius?: string;
}

export interface WidgetConfig {
  // ---- Auth (one of these required) ----
  /** Deepgram API key — fine for dev/server-side. Use tokenFactory for browser. */
  apiKey?: string;
  /** Factory called at connect + on every reconnect to vend a short-lived key. */
  tokenFactory?: TokenFactory;

  // ---- Agent ----
  /** Agent settings or pre-built agent UUID from the Deepgram console. */
  agent: AgentSettingsObject | string;

  // ---- UI ----
  /**
   * - `sidebar`: slides in from the right (default)
   * - `inline`: mounts into containerId
   * - `floating`: FAB button + overlay panel
   */
  layout?: WidgetLayout;
  /** ID of the container element for `inline` layout */
  containerId?: string;
  /** ID of the toggle button element for `sidebar`/`floating` layouts */
  buttonId?: string;
  /** Name shown in the panel header */
  name?: string;

  // ---- Features ----
  /** Enable Silero VAD (requires @ricky0123/vad-web peer dep). Default: false */
  vad?: boolean | MicrophoneOptions["vad"];
  /** Show conversation transcript in the panel. Default: true */
  showTranscript?: boolean;

  // ---- Styling ----
  theme?: WidgetTheme;

  // ---- Audio ----
  /** Sample rate of audio received from the agent. Default: 24_000 */
  playerSampleRate?: number;
}
