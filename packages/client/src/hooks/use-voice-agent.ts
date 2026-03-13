import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleAgentConfig } from '../types';
import type { CompositeVoice as CompositeVoiceType, LLMToolDefinition, LLMToolCall, LLMToolResult } from '@lukeocodes/composite-voice';

interface VoiceAgentState {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isInputMuted: boolean;
  isOutputMuted: boolean;
  interimTranscript: string;
  error: string | null;
}

interface ToolsConfig {
  definitions: LLMToolDefinition[];
  onToolCall: (toolCall: LLMToolCall) => Promise<LLMToolResult>;
}

interface VoiceAgentCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onLLMChunk?: (text: string) => void;
  onLLMComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceAgent(
  config: ConsoleAgentConfig,
  systemPrompt: string,
  callbacks: VoiceAgentCallbacks,
  toolsConfig?: ToolsConfig,
) {
  const [state, setState] = useState<VoiceAgentState>({
    isListening: false,
    isSpeaking: false,
    isThinking: false,
    isInputMuted: true,
    isOutputMuted: false,
    interimTranscript: '',
    error: null,
  });

  const agentRef = useRef<CompositeVoiceType | null>(null);
  const listeningStartedRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const initAgent = useCallback(async () => {
    if (agentRef.current) return agentRef.current;

    try {
      const {
        CompositeVoice,
        MicrophoneInput,
        DeepgramSTT,
        AnthropicLLM,
        DeepgramTTS,
        BrowserAudioOutput,
      } = await import('@lukeocodes/composite-voice');

      const deepgramProxyUrl = config.deepgramProxyUrl ?? '/api/proxy/deepgram';

      const agent = new CompositeVoice({
        providers: [
          new MicrophoneInput({
            sampleRate: 16000,
            channels: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }),
          new DeepgramSTT({
            proxyUrl: deepgramProxyUrl,
            options: {
              model: 'nova-3',
              encoding: 'linear16',
              sampleRate: 16000,
            },
          }),
          new AnthropicLLM({
            proxyUrl: config.anthropicProxyUrl ?? '/api/proxy/anthropic',
            model: 'claude-haiku-4-5-20251001',
            systemPrompt,
            maxTokens: 512,
          }),
          new DeepgramTTS({
            proxyUrl: deepgramProxyUrl,
            voice: 'aura-2-thalia-en',
          }),
          new BrowserAudioOutput({
            minBufferDuration: 300,
            enableSmoothing: true,
          }),
        ],
        conversationHistory: { enabled: true, maxTurns: 20 },
        turnTaking: {
          pauseCaptureOnPlayback: false,
        },
        ...(toolsConfig ? {
          tools: {
            definitions: toolsConfig.definitions,
            onToolCall: toolsConfig.onToolCall,
          },
        } : {}),
      });

      // Wire up events
      agent.on('transcription.interim', (event) => {
        setState((s) => ({ ...s, interimTranscript: event.text }));
        callbacksRef.current.onTranscript?.(event.text, false);
      });

      agent.on('transcription.final', (event) => {
        setState((s) => ({ ...s, interimTranscript: '' }));
        callbacksRef.current.onTranscript?.(event.text, true);
      });

      agent.on('llm.start', () => {
        setState((s) => ({ ...s, isThinking: true }));
      });

      agent.on('llm.chunk', (event) => {
        callbacksRef.current.onLLMChunk?.(event.chunk);
      });

      agent.on('llm.complete', (event) => {
        setState((s) => ({ ...s, isThinking: false }));
        callbacksRef.current.onLLMComplete?.(event.text);
      });

      agent.on('agent.stateChange', (event) => {
        setState((s) => ({
          ...s,
          isListening: event.state === 'listening',
          isSpeaking: event.state === 'speaking',
          isThinking: event.state === 'thinking',
        }));
      });

      agent.on('agent.error', (event) => {
        setState((s) => ({ ...s, error: event.error.message }));
        callbacksRef.current.onError?.(event.error.message);
      });

      agentRef.current = agent;
      return agent;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, error: `Failed to initialize voice agent: ${msg}` }));
      return null;
    }
  }, [config, systemPrompt, toolsConfig]);

  const start = useCallback(async () => {
    const agent = await initAgent();
    if (!agent) return;
    try {
      if (!agent.isReady()) {
        await agent.initialize();
      }
      await agent.startListening();
      listeningStartedRef.current = true;
      setState((s) => ({ ...s, isListening: true, isInputMuted: false, error: null }));
    } catch (err) {
      setState((s) => ({ ...s, error: `Start failed: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }, [initAgent]);

  const stop = useCallback(async () => {
    if (agentRef.current) {
      await agentRef.current.stopListening();
      listeningStartedRef.current = false;
      setState((s) => ({ ...s, isListening: false, isSpeaking: false, isThinking: false, isInputMuted: true }));
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    let agent = agentRef.current;
    if (!agent) {
      agent = await initAgent();
      if (!agent) return;
      await agent.initialize();
    }
    await agent.sendMessage(text);
  }, [initAgent]);

  const getHistory = useCallback(() => {
    return agentRef.current?.getHistory() ?? [];
  }, []);

  const toggleInput = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || !listeningStartedRef.current) {
      // Agent not created, or mic capture never started — do full start
      await start();
      return;
    }
    // Mic was started before — toggle pause/resume
    if (agent.isInputMuted) {
      await agent.unmuteInput();
      setState((s) => ({ ...s, isInputMuted: false }));
    } else {
      agent.muteInput();
      setState((s) => ({ ...s, isInputMuted: true }));
    }
  }, [start]);

  const toggleOutput = useCallback(async () => {
    let agent = agentRef.current;
    if (!agent) {
      // Initialize agent so we can set the mute preference
      agent = await initAgent();
      if (!agent) return;
      await agent.initialize();
    }
    if (agent.isOutputMuted) {
      agent.unmuteOutput();
      setState((s) => ({ ...s, isOutputMuted: false }));
    } else {
      agent.muteOutput();
      setState((s) => ({ ...s, isOutputMuted: true }));
    }
  }, [initAgent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentRef.current) {
        agentRef.current.dispose().catch(() => {});
      }
    };
  }, []);

  return { ...state, start, stop, sendMessage, getHistory, toggleInput, toggleOutput };
}
