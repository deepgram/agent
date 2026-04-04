import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentSession,
  AgentMicrophone,
  AgentPlayer,
  type AgentSessionConfig,
  type AgentState,
  type MicrophoneOptions,
  type FunctionCallItem,
} from "@deepgram/agent";
import { AgentContext, type ConversationEntry } from "./context.js";

export interface AgentProviderProps {
  config: AgentSessionConfig;

  /**
   * Enable microphone input. Default: true.
   * Set to false for text-only mode — no mic is opened at any point.
   */
  microphone?: boolean;

  /**
   * Options forwarded to AgentMicrophone (VAD, echo cancellation, etc.).
   * Only used when microphone={true}.
   */
  microphoneOptions?: MicrophoneOptions;

  /**
   * Enable TTS audio playback. Default: true.
   * Set to false to suppress agent speech — transcripts still appear.
   */
  tts?: boolean;

  /** Sample rate of audio from the agent. Must match Settings output. Default: 24_000 */
  playerSampleRate?: number;

  /**
   * Connect and start the mic automatically on mount.
   * Useful for ambient/kiosk use-cases. Default: false.
   */
  autoStart?: boolean;

  /**
   * Handle client-side function calls from the agent.
   * Return the result as a JSON-serialisable string.
   */
  onFunctionCall?: (fn: FunctionCallItem) => Promise<string> | string;

  // `unknown` allows Preact VNodes to be passed when the widget uses this
  // component from a Preact context (both runtimes are compatible at runtime)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
}

let _idSeq = 0;
const nextId = () => String(++_idSeq);

/**
 * Provides agent state and controls to the component tree.
 *
 * Feature flags:
 *   microphone={false}  → no mic is ever opened (text-only)
 *   tts={false}         → audio playback is suppressed
 *   autoStart           → connects + opens mic on mount
 *
 * Component presence determines UI surface:
 *   <AgentMicrophoneButton> → user can toggle the mic
 *   <AgentSpeakerButton>    → user can mute/unmute playback
 *   <AgentConversation>     → conversation history is rendered
 *   <AgentTextInput>        → user can send text messages
 *   No component for a feature → feature still works, just no control exposed
 */
export function AgentProvider({
  config,
  microphone = true,
  microphoneOptions,
  tts = true,
  playerSampleRate = 24_000,
  autoStart = false,
  onFunctionCall,
  children,
}: AgentProviderProps) {
  const sessionRef = useRef<AgentSession | null>(null);
  const micRef    = useRef<AgentMicrophone | null>(null);
  const playerRef = useRef<AgentPlayer | null>(null);

  if (!sessionRef.current) sessionRef.current = new AgentSession(config);
  if (tts && !playerRef.current) playerRef.current = new AgentPlayer({ sampleRate: playerSampleRate });

  const [state,       setState]       = useState<AgentState>("idle");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [micActive,   setMicActive]   = useState(false);
  const [micMuted,    setMicMutedState]  = useState(false);
  const [outputMuted, setOutputMutedState] = useState(false);

  // Wire all session events once on mount
  useEffect(() => {
    const session = sessionRef.current!;
    const player  = playerRef.current;

    const onState = () => setState(session.state);
    session.on("connecting",   onState);
    session.on("connected",    onState);
    session.on("reconnecting", onState);
    session.on("disconnected", onState);

    session.on("conversation-text", (msg) => {
      setConversation((prev) => [
        ...prev,
        { id: nextId(), role: msg.role as "user" | "assistant", content: msg.content },
      ]);
    });

    if (player) {
      session.on("audio", (chunk) => player.queue(chunk));
      session.on("user-started-speaking", () => player.interrupt());
    }

    session.on("function-call-request", async (msg) => {
      if (!onFunctionCall) return;
      for (const fn of msg.functions) {
        if (!fn.client_side) continue;
        try {
          const result = await onFunctionCall(fn);
          session.sendFunctionCallResponse(fn.id, fn.name, result);
        } catch (err) {
          session.sendFunctionCallResponse(fn.id, fn.name, JSON.stringify({ error: String(err) }));
        }
      }
    });

    if (autoStart) {
      _start(session, microphone, microphoneOptions, micRef, setMicActive).catch(console.error);
    }

    return () => {
      session.removeAllListeners();
      session.disconnect();
      micRef.current?.stop();
      player?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    const session = sessionRef.current!;
    await _start(session, microphone, microphoneOptions, micRef, setMicActive);
  }, [microphone, microphoneOptions]);

  const stop = useCallback(() => {
    sessionRef.current!.disconnect();
    micRef.current?.stop();
    micRef.current = null;
    setMicActive(false);
  }, []);

  const setMicMuted = useCallback((muted: boolean) => {
    if (!micRef.current) return;
    muted ? micRef.current.mute() : micRef.current.unmute();
    setMicMutedState(muted);
  }, []);

  const setOutputMuted = useCallback((muted: boolean) => {
    if (!playerRef.current) return;
    muted ? playerRef.current.mute() : playerRef.current.unmute();
    setOutputMutedState(muted);
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    sessionRef.current?.injectUserMessage(text);
  }, []);

  const clearConversation = useCallback(() => setConversation([]), []);

  return (
    <AgentContext.Provider
      value={{
        session: sessionRef.current!,
        state,
        start,
        stop,
        conversation,
        clearConversation,
        sendUserMessage,
        micActive,
        micMuted,
        setMicMuted,
        micEnabled: microphone,
        outputMuted,
        setOutputMuted,
        ttsEnabled: tts,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _start(
  session: AgentSession,
  microphoneEnabled: boolean,
  microphoneOptions: MicrophoneOptions | undefined,
  micRef: React.MutableRefObject<AgentMicrophone | null>,
  setMicActive: (v: boolean) => void,
): Promise<void> {
  await session.connect();

  if (microphoneEnabled) {
    micRef.current?.stop();
    const mic = new AgentMicrophone(
      (data) => session.sendAudio(data),
      microphoneOptions,
    );
    micRef.current = mic;
    await mic.start();
    setMicActive(true);
  }
}
