import { BEHAVIORAL_GUIDELINES } from './guides';
import { CODE_HANDLING } from './code-handling';
import { TEXT_NORMALISATION } from './text-normalisation';
import { TOOL_GUIDELINES } from './tools';

const UI_LAYOUT = `## UI Layout
You are displayed in a sidebar panel. Below the chat message area, the user sees (left to right): a microphone toggle, a speaker toggle, a text input field, and a send button.`;

/**
 * Universal behavioral guidelines for any voice agent deployment.
 * Always prepended to the system prompt — not optional.
 */
export const BASE_AGENT_GUIDELINES = [
  UI_LAYOUT,
  BEHAVIORAL_GUIDELINES,
  TEXT_NORMALISATION,
  CODE_HANDLING,
  TOOL_GUIDELINES,
].join('\n\n');
