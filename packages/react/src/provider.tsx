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
import { AgentContext, type AgentMode, type ConversationEntry } from "./context.js";

export interface AgentProviderProps {
  config: AgentSessionConfig;
  microphone?: boolean;
  microphoneOptions?: MicrophoneOptions;
  tts?: boolean;
  playerSampleRate?: number;
  autoStart?: boolean;
  onFunctionCall?: (fn: FunctionCallItem) => Promise<string> | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
}

let _idSeq = 0;
const nextId = () => String(++_idSeq);

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

  // Dynamic client tools — registered/unregistered by useAgentClientTool
  const clientToolsRef = useRef<Map<string, (fn: FunctionCallItem) => Promise<string> | string>>(new Map());

  if (!sessionRef.current) sessionRef.current = new AgentSession(config);
  if (tts && !playerRef.current) playerRef.current = new AgentPlayer({ sampleRate: playerSampleRate });

  const [state,       setState]       = useState<AgentState>("idle");
  const [mode,        setMode]        = useState<AgentMode>("idle");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [micActive,   setMicActive]   = useState(false);
  const [micMuted,    setMicMutedState]  = useState(false);
  const [outputMuted, setOutputMutedState] = useState(false);

  useEffect(() => {
    const session = sessionRef.current!;
    const player  = playerRef.current;

    const onState = () => setState(session.state);
    session.on("connecting",   onState);
    session.on("connected",    onState);
    session.on("reconnecting", onState);
    session.on("disconnected", () => { onState(); setMode("idle"); });

    // Mode tracking: speaking / listening
    session.on("agent-started-speaking", () => setMode("speaking"));
    session.on("agent-audio-done",       () => setMode("listening"));
    session.on("user-started-speaking",  () => {
      setMode("listening");
      player?.interrupt();
    });
    session.on("settings-applied", () => setMode("listening"));

    session.on("conversation-text", (msg) => {
      setConversation((prev) => [
        ...prev,
        { id: nextId(), role: msg.role as "user" | "assistant", content: msg.content },
      ]);
    });

    if (player) {
      session.on("audio", (chunk) => player.queue(chunk));
    }

    session.on("function-call-request", async (msg) => {
      for (const fn of msg.functions) {
        if (!fn.client_side) continue;
        // Check dynamic client tools first, then fall back to prop
        const dynamicHandler = clientToolsRef.current.get(fn.name);
        const handler = dynamicHandler ?? onFunctionCall;
        if (!handler) continue;
        try {
          const result = await handler(fn);
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

  const registerClientTool = useCallback((
    name: string,
    handler: (fn: FunctionCallItem) => Promise<string> | string,
  ) => {
    clientToolsRef.current.set(name, handler);
  }, []);

  const unregisterClientTool = useCallback((name: string) => {
    clientToolsRef.current.delete(name);
  }, []);

  // Volume getters — stable refs, called per animation frame by visualizers
  const getInputVolume = useCallback(
    () => micRef.current?.getInputVolume() ?? 0,
    [],
  );
  const getOutputVolume = useCallback(
    () => playerRef.current?.getOutputVolume() ?? 0,
    [],
  );

  return (
    <AgentContext.Provider
      value={{
        session: sessionRef.current!,
        state,
        mode,
        isSpeaking: mode === "speaking",
        isListening: mode === "listening",
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
        getInputVolume,
        getOutputVolume,
        registerClientTool,
        unregisterClientTool,
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
