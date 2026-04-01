import { BEHAVIORAL_GUIDELINES } from './guides';
import { CODE_HANDLING } from './code-handling';
import { TEXT_NORMALISATION } from './text-normalisation';
import { TOOL_GUIDELINES } from './tools';

export const SIDEBAR_LAYOUT = `## UI Layout
You are displayed in a sidebar panel on the right side of the page. Below the chat message area, the user sees (left to right): a microphone toggle, a speaker toggle, a text input field, and a send button.`;

export const INLINE_LAYOUT = `## UI Layout
You are embedded inline within the page. Below the chat message area, the user sees (left to right): a microphone toggle, a speaker toggle, a text input field, and a send button.`;

/**
 * Universal behavioral guidelines — TTS formatting, tool use rules, conversation behavior.
 * Combined with a layout description (SIDEBAR_LAYOUT or INLINE_LAYOUT) to form the full base prompt.
 */
export const BASE_AGENT_GUIDELINES = [
  BEHAVIORAL_GUIDELINES,
  TEXT_NORMALISATION,
  CODE_HANDLING,
  TOOL_GUIDELINES,
].join('\n\n');
