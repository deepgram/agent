import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentState, ChatMessage, ConsoleAgentConfig, PendingSkill } from '../types';
import type { LLMToolCall, LLMToolResult } from '@lukeocodes/composite-voice';
import { ChatMessageBubble } from './ChatMessage';
import { MicrophoneIcon, MicrophoneMutedIcon, SendIcon, SpeakerIcon, SpeakerMutedIcon, ClearIcon } from './icons';
import { useVoiceAgent } from '../agent/voice';
import { useSkillExecutor } from '../skills/executor';
import { buildToolDefinitions, getSkill } from '../skills';
import { deepgramKnowledgeSkill } from '../skills/deepgram-mcp';
import { fetchDeepgramSkillsContext } from '../skills/github-context';
import { BASE_AGENT_GUIDELINES, SIDEBAR_LAYOUT, INLINE_LAYOUT } from '../prompt/base';
import { addMessage, clearConversation, generateId, getProjectIdFromUrl, loadState, saveState } from '../state';

const AFFIRMATIVE_PATTERNS = /^\s*(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|confirm|proceed|absolutely|affirmative)\s*[.!]?\s*$/i;

interface Props {
  config: ConsoleAgentConfig;
}

export function ChatPanel({ config }: Props) {
  const [agentState, setAgentState] = useState<AgentState>(loadState);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [pendingSkill, setPendingSkill] = useState<PendingSkill | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectId = config.projectId ?? getProjectIdFromUrl();

  // Layout description — sidebar for buttonId, inline for containerId
  const layoutGuideline = config.containerId ? INLINE_LAYOUT : SIDEBAR_LAYOUT;

  // Site-specific skills merged with built-in skills
  const siteSkills = config.skills ?? [];
  const allSkills = [deepgramKnowledgeSkill, ...siteSkills];

  // Deepgram knowledge context — fetched on mount, appended to system prompt
  const [deepgramContext, setDeepgramContext] = useState('');
  const basePrompt = `${layoutGuideline}\n\n${BASE_AGENT_GUIDELINES}`;
  const systemPrompt = config.systemPrompt
    ? `${basePrompt}\n\n${config.systemPrompt}${deepgramContext ? `\n\n${deepgramContext}` : ''}`
    : `${basePrompt}${deepgramContext ? `\n\n${deepgramContext}` : ''}`;

  useEffect(() => {
    fetchDeepgramSkillsContext().then((ctx) => {
      if (ctx) setDeepgramContext(ctx);
    }).catch(() => {});
  }, []);

  // Token ref bridges the voice agent credentials to the skill executor
  const dxApiTokenRef = useRef<() => string | null>(() => null);
  const { executeSkill } = useSkillExecutor(config, () => dxApiTokenRef.current());

  // Accumulate LLM chunks
  const streamingAccumRef = useRef('');

  // Visual content from the most recent tool call — attached to the next assistant message
  const pendingSourcesRef = useRef<import('../types').SourceLink[]>([]);
  const pendingCtaRef = useRef<import('../types').SourceLink | null>(null);

  // Tool definitions: built-in skills + site skills
  const toolDefs = useRef(buildToolDefinitions(allSkills)).current;

  /** Execute a pending skill (after confirmation) and return tool result */
  const confirmAndExecute = useCallback(async (skill: PendingSkill) => {
    setPendingSkill(null);
    const result = await executeSkill(skill.skillId, skill.params);
    setAgentState((prev) =>
      addMessage(prev, {
        id: generateId(),
        role: 'system',
        content: result.success ? `Done: ${result.message}` : `Failed: ${result.message}`,
        timestamp: Date.now(),
        skillUsed: skill.skillId,
      })
    );
  }, [executeSkill]);

  /** Cancel a pending skill */
  const cancelPending = useCallback(() => {
    setPendingSkill(null);
    setAgentState((prev) =>
      addMessage(prev, {
        id: generateId(),
        role: 'system',
        content: 'Action cancelled.',
        timestamp: Date.now(),
      })
    );
  }, []);

  /**
   * Handle a tool call from the LLM via CompositeVoice.
   * Safe skills execute immediately. Confirm/dangerous return an "awaiting" result.
   */
  const handleToolCall = useCallback(async (toolCall: LLMToolCall): Promise<LLMToolResult> => {
    const skill = getSkill(toolCall.name, allSkills);
    if (!skill) {
      return { toolCallId: toolCall.id, content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }), isError: true };
    }

    // Show tool call in chat
    setAgentState((prev) =>
      addMessage(prev, {
        id: generateId(),
        role: 'system',
        content: `Running: ${skill.name}`,
        timestamp: Date.now(),
        skillUsed: skill.id,
      })
    );

    // Safe skills execute immediately
    if (skill.risk === 'safe') {
      const result = await executeSkill(toolCall.name, toolCall.arguments);
      const resultContent = result.data
        ? JSON.stringify(result.data).slice(0, 2000)
        : result.message;

      // Append recent tool results as context so the LLM has reference data
      const state = loadState();
      const cachedKeys = Object.keys(state.recentToolResults ?? {}).filter((k) => k !== toolCall.name);
      let context = '';
      if (cachedKeys.length > 0) {
        const relevant = cachedKeys.map((k) => {
          const data = JSON.stringify(state.recentToolResults![k]).slice(0, 500);
          return `${k}: ${data}`;
        }).join('\n');
        context = `\n\n[Recent data from other tools for reference]\n${relevant}`;
      }

      if (result.sources?.length) pendingSourcesRef.current = result.sources;
      if (result.cta) pendingCtaRef.current = result.cta;

      return { toolCallId: toolCall.id, content: resultContent + context, isError: !result.success };
    }

    // Confirm: return pending message, LLM will tell the user
    if (skill.risk === 'confirm') {
      setPendingSkill({
        skillId: skill.id,
        skillName: skill.name,
        risk: skill.risk,
        params: toolCall.arguments,
      });
      return {
        toolCallId: toolCall.id,
        content: `This action requires user confirmation. Ask the user to confirm before proceeding. The action is: ${skill.name}`,
      };
    }

    // Dangerous: execute (navigates to page)
    const result = await executeSkill(toolCall.name, toolCall.arguments);
    return {
      toolCallId: toolCall.id,
      content: result.message,
      isError: !result.success,
    };
  }, [executeSkill, allSkills]);

  const voiceAgent = useVoiceAgent(config, systemPrompt, {
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        if (pendingSkill?.risk === 'confirm' && AFFIRMATIVE_PATTERNS.test(text)) {
          setAgentState((prev) =>
            addMessage(prev, { id: generateId(), role: 'user', content: text, timestamp: Date.now() })
          );
          void confirmAndExecute(pendingSkill);
          return;
        }

        setAgentState((prev) =>
          addMessage(prev, { id: generateId(), role: 'user', content: text, timestamp: Date.now() })
        );
      }
    }, [pendingSkill, confirmAndExecute]),
    onLLMChunk: useCallback((text: string) => {
      streamingAccumRef.current += text;
      setStreamingText(streamingAccumRef.current);
    }, []),
    onLLMComplete: useCallback(async (text: string) => {
      streamingAccumRef.current = '';
      setStreamingText('');

      if (text.trim()) {
        const sources = pendingSourcesRef.current.length > 0
          ? [...pendingSourcesRef.current]
          : undefined;
        let cta = pendingCtaRef.current ?? undefined;
        pendingSourcesRef.current = [];
        pendingCtaRef.current = null;

        let displayText = text;
        const ctaMatch = text.match(/\[CTA:\s*(.+?)\]\s*$/);
        if (ctaMatch && cta) {
          cta = { ...cta, title: ctaMatch[1].trim() };
          displayText = text.slice(0, ctaMatch.index).trimEnd();
        }

        const msg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
          sources,
          cta,
        };
        setAgentState((prev) => addMessage(prev, msg));
      }
    }, []),
    onError: useCallback((error: string) => {
      setAgentState((prev) =>
        addMessage(prev, { id: generateId(), role: 'system', content: `Error: ${error}`, timestamp: Date.now() })
      );
    }, []),
  }, {
    definitions: toolDefs,
    onToolCall: handleToolCall,
  });

  // Bridge the voice agent's token to the skill executor
  dxApiTokenRef.current = voiceAgent.getToken;

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

  const handleSendText = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (pendingSkill?.risk === 'confirm' && AFFIRMATIVE_PATTERNS.test(text)) {
      setAgentState((prev) =>
        addMessage(prev, { id: generateId(), role: 'user', content: text, timestamp: Date.now() })
      );
      await confirmAndExecute(pendingSkill);
      return;
    }

    if (pendingSkill) {
      cancelPending();
    }

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
  }, [input, voiceAgent, pendingSkill, confirmAndExecute, cancelPending]);

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
    setPendingSkill(null);
  }, []);

  return (
    <div className="dg-agent-panel">
      <div className="dg-agent-panel__header">
        <span className="dg-agent-panel__title">{config.name ?? 'Assistant'}</span>
        <button className="dg-agent-panel__btn" onClick={handleClear} title="Clear conversation">
          <ClearIcon />
        </button>
      </div>

      <div className="dg-agent-panel__messages">
        {agentState.conversationHistory.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onConfirm={msg.pendingSkill ? () => confirmAndExecute(msg.pendingSkill!) : undefined}
            onCancel={msg.pendingSkill ? cancelPending : undefined}
            isPending={msg.pendingSkill?.skillId === pendingSkill?.skillId}
          />
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
