import type { Skill } from '../types';

/**
 * Built-in skill that queries the Deepgram documentation MCP server at
 * api.dx.deepgram.com/kapa/mcp using the same DX JWT as all other requests.
 *
 * The MCP endpoint accepts standard JSON-RPC 2.0 tool calls and returns
 * documentation excerpts for any technical question about Deepgram.
 */
export const deepgramKnowledgeSkill: Skill = {
  id: 'deepgram-knowledge',
  name: 'Search Deepgram Docs',
  description: 'Search Deepgram documentation for technical information about APIs, SDKs, models, features, audio formats, pricing, and supported languages. Use this for any question about how Deepgram works.',
  category: 'knowledge',
  risk: 'safe',
  parameters: [
    { name: 'query', type: 'string', description: 'What to search for in the Deepgram docs', required: true },
  ],
  execute: async (params, ctx) => {
    if (!ctx.dxApiToken) {
      return { success: false, message: 'Not authenticated with DX API. Please try again.' };
    }

    const query = params.query as string;

    try {
      const res = await fetch(`${ctx.dxApiUrl}/kapa/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.dxApiToken}`,
          'X-DX-Auth-Mode': 'session',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'search_deepgram_knowledge_sources',
            arguments: { query },
          },
          id: 1,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Docs search failed (${res.status}): ${text}` };
      }

      const data = await res.json();

      // MCP JSON-RPC response: { result: { content: [{ type: 'text', text: '...' }] } }
      const content: Array<{ type: string; text?: string }> = data?.result?.content ?? [];
      const text = content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('\n\n');

      if (!text) return { success: true, message: 'No results found for that query.' };

      return { success: true, message: text, data };
    } catch (err) {
      return {
        success: false,
        message: `Docs search failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
