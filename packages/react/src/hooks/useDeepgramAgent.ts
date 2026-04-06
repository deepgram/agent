import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentSession,
  AgentMicrophone,
  AgentPlayer,
  type AgentSessionConfig,
  type MicrophoneOptions,
  type AgentState,
  type ConversationTextMessage,
  type FunctionCallRequestMessage,
} from "@deepgram/agent";

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface UseDeepgramAgentOptions {
  config: AgentSessionConfig;
  micOptions?: MicrophoneOptions;
  playerSampleRate?: number;
  /**
   * Called when the agent requests a function call.
   * Return the result as a string (JSON-serialised).
   */
  onFunctionCall?: (
    fn: FunctionCallRequestMessage["functions"][number],
  ) => Promise<string> | string;
}

export interface UseDeepgramAgentResult {
  /** Current connection state */
  state: AgentState;
  /** Whether microphone is active */
  micActive: boolean;
  /** Whether agent audio is muted */
  outputMuted: boolean;
  /** Conversation history (user + agent turns) */
  conversation: ConversationEntry[];
  /** Start session + microphone */
  start: () => Promise<void>;
  /** Stop session + microphone */
  stop: () => void;
  /** Mute/unmute mic input */
  setMicMuted: (muted: boolean) => void;
  /** Mute/unmute agent audio output */
  setOutputMuted: (muted: boolean) => void;
  /** Send a text message as the user */
  sendUserMessage: (text: string) => void;
  /** Interrupt agent speech immediately */
  interrupt: () => void;
}

let entryCounter = 0;
const nextId = () => String(++entryCounter);

/**
 * All-in-one hook for a Deepgram Voice Agent session.
 *
 * Creates and manages an AgentSession + AgentMicrophone + AgentPlayer.
 * Suitable for simple single-widget use cases. For shared session state
 * across multiple components, use <AgentProvider> + useAgentContext().
 */
export function useDeepgramAgent({
  config,
  micOptions = {},
  playerSampleRate = 24_000,
  onFunctionCall,
}: UseDeepgramAgentOptions): UseDeepgramAgentResult {
  const sessionRef = useRef<AgentSession | null>(null);
  const micRef = useRef<AgentMicrophone | null>(null);
  const playerRef = useRef<AgentPlayer | null>(null);

  const [state, setState] = useState<AgentState>("idle");
  const [micActive, setMicActive] = useState(false);
  const [outputMuted, setOutputMutedState] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  const getSession = useCallback((): AgentSession => {
    if (!sessionRef.current) {
      sessionRef.current = new AgentSession(config);
    }
    return sessionRef.current;
  }, []); // config intentionally not in deps — session lives for hook lifetime

  const getPlayer = useCallback((): AgentPlayer => {
    if (!playerRef.current) {
      playerRef.current = new AgentPlayer({ sampleRate: playerSampleRate });
    }
    return playerRef.current;
  }, [playerSampleRate]);

  // Wire session events once
  useEffect(() => {
    const session = getSession();
    const player = getPlayer();

    const onState = () => setState(session.state);
    session.on("connecting", onState);
    session.on("connected", onState);
    session.on("reconnecting", onState);
    session.on("disconnected", onState);

    session.on("conversation-text", (msg: ConversationTextMessage) => {
      setConversation((prev) => [
        ...prev,
        { id: nextId(), role: msg.role as "user" | "assistant", content: msg.content },
      ]);
    });

    session.on("audio", (chunk: ArrayBuffer) => {
      player.queue(chunk);
    });

    // Barge-in: when user starts speaking, interrupt agent audio
    session.on("user-started-speaking", () => {
      player.interrupt();
    });

    session.on("function-call-request", async (msg: FunctionCallRequestMessage) => {
      if (!onFunctionCall) return;
      for (const fn of msg.functions) {
        if (!fn.client_side) continue;
        try {
          const result = await onFunctionCall(fn);
          session.sendFunctionCallResponse(fn.id, fn.name, result);
        } catch (err) {
          session.sendFunctionCallResponse(
            fn.id,
            fn.name,
            JSON.stringify({ error: String(err) }),
          );
        }
      }
    });

    return () => {
      session.removeAllListeners();
      session.disconnect();
      player.dispose();
      micRef.current?.stop();
    };
  }, []); // run once

  const start = useCallback(async () => {
    const session = getSession();
    await session.connect();

    const mic = new AgentMicrophone(
      (data) => session.sendAudio(data),
      micOptions,
    );

    micRef.current?.stop();
    micRef.current = mic;
    await mic.start();
    setMicActive(true);
  }, [micOptions]);

  const stop = useCallback(() => {
    sessionRef.current?.disconnect();
    micRef.current?.stop();
    micRef.current = null;
    setMicActive(false);
  }, []);

  const setMicMuted = useCallback((muted: boolean) => {
    if (!micRef.current) return;
    muted ? micRef.current.mute() : micRef.current.unmute();
  }, []);

  const setOutputMuted = useCallback((muted: boolean) => {
    const player = getPlayer();
    muted ? player.mute() : player.unmute();
    setOutputMutedState(muted);
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    sessionRef.current?.injectUserMessage(text);
  }, []);

  const interrupt = useCallback(() => {
    getPlayer().interrupt();
  }, []);

  return {
    state,
    micActive,
    outputMuted,
    conversation,
    start,
    stop,
    setMicMuted,
    setOutputMuted,
    sendUserMessage,
    interrupt,
  };
}
