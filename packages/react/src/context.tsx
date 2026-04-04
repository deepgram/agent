import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import {
  AgentSession,
  AgentPlayer,
  type AgentSessionConfig,
  type MicrophoneOptions,
} from "@deepgram/voice-agent";

export interface AgentContextValue {
  session: AgentSession;
  player: AgentPlayer;
  micOptions: MicrophoneOptions;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export interface AgentProviderProps {
  config: AgentSessionConfig;
  /** Options forwarded to AgentMicrophone when the hook starts the mic */
  micOptions?: MicrophoneOptions;
  /** Sample rate of audio coming from the agent. Default: 24_000 */
  playerSampleRate?: number;
  children: ReactNode;
}

/**
 * Provides a shared AgentSession and AgentPlayer to the component tree.
 * The session and player are created once and live as long as the provider.
 */
export function AgentProvider({
  config,
  micOptions = {},
  playerSampleRate = 24_000,
  children,
}: AgentProviderProps) {
  const sessionRef = useRef<AgentSession | null>(null);
  const playerRef = useRef<AgentPlayer | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = new AgentSession(config);
  }
  if (!playerRef.current) {
    playerRef.current = new AgentPlayer({ sampleRate: playerSampleRate });
  }

  return (
    <AgentContext.Provider
      value={{
        session: sessionRef.current,
        player: playerRef.current,
        micOptions,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgentContext must be used within <AgentProvider>");
  }
  return ctx;
}
