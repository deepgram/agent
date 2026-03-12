import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentState, ChatMessage, ConsoleAgentConfig } from '../types';
import { ChatMessageBubble } from './chat-message';
import { MicrophoneIcon, MicrophoneMutedIcon, SendIcon, SpeakerIcon, SpeakerMutedIcon, ClearIcon } from './icons';
import { useVoiceAgent } from '../hooks/use-voice-agent';
import { useSkillExecutor } from '../hooks/use-skill-executor';
import { buildSkillSystemPrompt } from '../skills/registry';
import { addMessage, clearConversation, generateId, getProjectIdFromUrl, loadState, saveState } from '../utils/state';

interface Props {
  config: ConsoleAgentConfig;
}

export function ChatPanel({ config }: Props) {
  const [agentState, setAgentState] = useState<AgentState>(loadState);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectId = config.projectId ?? getProjectIdFromUrl();
  const systemPrompt = buildSkillSystemPrompt(projectId);
  const { processResponse } = useSkillExecutor(config);

  // Accumulate LLM chunks
  const streamingAccumRef = useRef('');

  const voiceAgent = useVoiceAgent(config, systemPrompt, {
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        setAgentState((prev) =>
          addMessage(prev, { id: generateId(), role: 'user', content: text, timestamp: Date.now() })
        );
      }
    }, []),
    onLLMChunk: useCallback((text: string) => {
      streamingAccumRef.current += text;
      setStreamingText(streamingAccumRef.current);
    }, []),
    onLLMComplete: useCallback(async (text: string) => {
      streamingAccumRef.current = '';
      setStreamingText('');

      const skillExec = await processResponse(text);

      const msg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        skillUsed: skillExec?.skillId,
      };

      setAgentState((prev) => {
        let next = addMessage(prev, msg);
        if (skillExec) {
          next = addMessage(next, {
            id: generateId(),
            role: 'system',
            content: skillExec.result.message,
            timestamp: Date.now(),
            skillUsed: skillExec.skillId,
          });
        }
        return next;
      });
    }, [processResponse]),
    onError: useCallback((error: string) => {
      setAgentState((prev) =>
        addMessage(prev, { id: generateId(), role: 'system', content: `Error: ${error}`, timestamp: Date.now() })
      );
    }, []),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentState.conversationHistory, streamingText]);

  // Persist page location on navigation
  useEffect(() => {
    const updated = { ...agentState, lastPage: window.location.pathname, currentProjectId: projectId };
    saveState(updated);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Welcome message on first load
  useEffect(() => {
    if (agentState.conversationHistory.length === 0) {
      const welcome: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "Hi! I'm your Deepgram Console assistant. I can help you manage API keys, billing, team members, usage, and more. Try asking me something or click the microphone to talk.",
        timestamp: Date.now(),
      };
      setAgentState((prev) => addMessage(prev, welcome));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send text via composite-voice's sendMessage (unified pipeline)
  const handleSendText = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    setAgentState((prev) => addMessage(prev, userMsg));

    try {
      await voiceAgent.sendMessage(text);
    } catch (err) {
      setAgentState((prev) =>
        addMessage(prev, {
          id: generateId(),
          role: 'system',
          content: `Failed to get response: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        })
      );
    }
  }, [input, voiceAgent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const handleClear = useCallback(() => {
    setAgentState((prev) => clearConversation(prev));
    setStreamingText('');
    streamingAccumRef.current = '';
  }, []);

  return (
    <div className="dg-agent-panel">
      <div className="dg-agent-panel__header">
        <span className="dg-agent-panel__title">Console Assistant</span>
        <button className="dg-agent-panel__btn" onClick={handleClear} title="Clear conversation">
          <ClearIcon />
        </button>
      </div>

      <div className="dg-agent-panel__messages">
        {agentState.conversationHistory.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}

        {streamingText && (
          <div className="dg-agent-message">
            <div className="dg-agent-message__content dg-agent-message__content--streaming">
              {streamingText}
              <span className="dg-agent-cursor" />
            </div>
          </div>
        )}

        {voiceAgent.interimTranscript && (
          <div className="dg-agent-message dg-agent-message--user">
            <div className="dg-agent-message__content dg-agent-message__content--interim">
              {voiceAgent.interimTranscript}
            </div>
          </div>
        )}

        {voiceAgent.isThinking && !streamingText && (
          <div className="dg-agent-message">
            <div className="dg-agent-message__content dg-agent-message__content--thinking">
              <span className="dg-agent-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {voiceAgent.error && (
        <div className="dg-agent-panel__error">
          {voiceAgent.error}
        </div>
      )}

      <div className="dg-agent-panel__input">
        <button
          className={`dg-agent-panel__mic ${!voiceAgent.isInputMuted ? 'dg-agent-panel__mic--active' : ''}`}
          onClick={voiceAgent.toggleInput}
          title={voiceAgent.isInputMuted ? 'Enable microphone' : 'Disable microphone'}
        >
          {voiceAgent.isInputMuted ? <MicrophoneMutedIcon /> : <MicrophoneIcon />}
        </button>
        <button
          className={`dg-agent-panel__speaker ${!voiceAgent.isOutputMuted ? 'dg-agent-panel__speaker--active' : ''}`}
          onClick={voiceAgent.toggleOutput}
          title={voiceAgent.isOutputMuted ? 'Enable speaker' : 'Disable speaker'}
        >
          {voiceAgent.isOutputMuted ? <SpeakerMutedIcon /> : <SpeakerIcon />}
        </button>
        <textarea
          ref={inputRef}
          className="dg-agent-panel__textarea"
          placeholder="Ask about your project..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="dg-agent-panel__send"
          onClick={handleSendText}
          disabled={!input.trim()}
          title="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
