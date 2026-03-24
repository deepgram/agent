/** Configuration for the console agent widget */
export interface ConsoleAgentConfig {
  /** ID of the button element that toggles the agent panel */
  buttonId?: string;
  /** ID of the container element for inline embedding */
  containerId?: string;
  /** Base URL for the DX API (default: https://api.dx.deepgram.com) */
  dxApiUrl?: string;
  /** Base URL for the Deepgram management API (default: https://manage.deepgram.com) */
  manageUrl?: string;
  /** Base URL for the DX identity service (default: https://id.dx.deepgram.com) */
  idServiceUrl?: string;
  /** Current project ID from the console */
  projectId?: string;
  /** Base URL for console API (defaults to current origin) */
  apiBaseUrl?: string;
}

/** Risk level determines what confirmation the agent requires before executing */
export type SkillRisk = 'safe' | 'confirm' | 'dangerous';

/** A skill the agent can execute on behalf of the user */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  risk: SkillRisk;
  parameters: SkillParameter[];
  execute: (params: Record<string, unknown>, context: SkillContext) => Promise<SkillResult>;
}

export type SkillCategory =
  | 'navigation'
  | 'project'
  | 'api-keys'
  | 'team'
  | 'billing'
  | 'usage'
  | 'settings'
  | 'self-hosted'
  | 'auth';

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  required: boolean;
  enumValues?: string[];
}

export interface SkillContext {
  projectId: string | null;
  apiBaseUrl: string;
  /** DX API base URL for relay services (Kapa, etc.) */
  dxApiUrl: string;
  /** DX API JWT token for authenticated relay calls */
  dxApiToken: string | null;
  navigate: (path: string) => void;
  /** Get cached result from a previous tool execution */
  getToolResult: (skillId: string) => unknown | undefined;
  /** All recent tool results — skills can search across them */
  recentToolResults: Record<string, unknown>;
}

/** A source link to display in the chat UI (not spoken by TTS) */
export interface SourceLink {
  title: string;
  url: string;
}

export interface SkillResult {
  success: boolean;
  message: string;
  data?: unknown;
  navigateTo?: string;
  /** Links to show in the chat UI below the assistant's response. Never sent to TTS. */
  sources?: SourceLink[];
  /** A prominent call-to-action link (e.g. "Read the full guide"). Never sent to TTS. */
  cta?: SourceLink;
}

/** A skill awaiting user confirmation before execution */
export interface PendingSkill {
  skillId: string;
  skillName: string;
  risk: SkillRisk;
  params: Record<string, unknown>;
}

/** Chat message in the conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skillUsed?: string;
  pendingSkill?: PendingSkill;
  /** Source links to render as clickable pills below the message */
  sources?: SourceLink[];
  /** Prominent call-to-action link rendered as a button */
  cta?: SourceLink;
}

/** Persisted agent state for cross-page continuity */
export interface AgentState {
  conversationHistory: ChatMessage[];
  currentProjectId: string | null;
  lastPage: string;
  pendingAction?: string;
  /** Cached results from recent tool executions, keyed by skill ID */
  recentToolResults?: Record<string, unknown>;
}
