import type { AgentState, ChatMessage } from '../types';

const STORAGE_KEY = 'dg-console-agent-state';

/** Load persisted agent state from localStorage */
export function loadState(): AgentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AgentState;
    }
  } catch {
    // Corrupted state — start fresh
  }
  return {
    conversationHistory: [],
    currentProjectId: null,
    lastPage: window.location.pathname,
    pendingAction: undefined,
  };
}

/** Persist agent state to localStorage */
export function saveState(state: AgentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Add a message and persist */
export function addMessage(state: AgentState, msg: ChatMessage): AgentState {
  const next: AgentState = {
    ...state,
    conversationHistory: [...state.conversationHistory, msg],
    lastPage: window.location.pathname,
  };
  saveState(next);
  return next;
}

/** Clear conversation but keep other state */
export function clearConversation(state: AgentState): AgentState {
  const next: AgentState = {
    ...state,
    conversationHistory: [],
    pendingAction: undefined,
  };
  saveState(next);
  return next;
}

/** Extract the project ID from the current URL */
export function getProjectIdFromUrl(): string | null {
  const match = window.location.pathname.match(/\/project\/([^/]+)/);
  return match ? match[1] : null;
}

/** Generate a unique message ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
