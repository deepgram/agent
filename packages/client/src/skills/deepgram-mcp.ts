import type { Skill } from '../types';

/**
 * "Deepgram MCP" — answers technical questions about Deepgram APIs, SDKs,
 * and products by querying the Kapa-backed chat endpoint on dx-api.
 *
 * Uses the same dx-api JWT as the other relay routes.
 */
export const deepgramMcpSkills: Skill[] = [
  {
    id: 'deepgram-mcp',
    name: 'Deepgram MCP',
    description: 'Answer technical questions about Deepgram APIs, SDKs, models, features, and products. Use this when the user asks how to do something with Deepgram, asks about pricing, models, supported languages, SDKs, or any Deepgram documentation topic.',
    category: 'navigation',
    risk: 'safe',
    parameters: [
      { name: 'question', type: 'string', description: 'The technical question to answer', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.dxApiToken) {
        return { success: false, message: 'Not authenticated with DX API. Please try again.' };
      }

      try {
        const res = await fetch(`${ctx.dxApiUrl}/kapa/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.dxApiToken}`,
          },
          body: JSON.stringify({ query: params.question }),
        });

        if (!res.ok) {
          const text = await res.text();
          return { success: false, message: `Deepgram MCP error (${res.status}): ${text}` };
        }

        const data = await res.json();
        const answer = data?.answer ?? data?.text ?? JSON.stringify(data);
        return { success: true, message: answer, data };
      } catch (err) {
        return {
          success: false,
          message: `Failed to query Deepgram MCP: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  },
];
