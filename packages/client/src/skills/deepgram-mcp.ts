import type { Skill } from '../types';

/**
 * Deepgram knowledge tools — answer technical questions via Kapa-backed
 * endpoints on dx-api. Two tools:
 *
 * - deepgram-mcp-search: fast retrieval of relevant doc chunks (no LLM)
 * - deepgram-mcp: full LLM-synthesized answer with sources
 *
 * The LLM should prefer search for quick lookups and use chat for
 * complex questions that need a synthesized answer.
 */
export const deepgramMcpSkills: Skill[] = [
  {
    id: 'deepgram-mcp-search',
    name: 'Deepgram Search',
    description: 'Search Deepgram documentation and return relevant excerpts. Use this for quick factual lookups like supported models, parameter names, SDK methods, or code examples. Faster than deepgram-mcp but returns raw document chunks instead of a synthesized answer.',
    category: 'navigation',
    risk: 'safe',
    parameters: [
      { name: 'query', type: 'string', description: 'The search query', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.dxApiToken) {
        return { success: false, message: 'Not authenticated with DX API. Please try again.' };
      }

      try {
        const res = await fetch(`${ctx.dxApiUrl}/kapa/retrieval/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.dxApiToken}`,
          },
          body: JSON.stringify({ query: params.query }),
        });

        if (!res.ok) {
          const text = await res.text();
          return { success: false, message: `Search error (${res.status}): ${text}` };
        }

        const data = await res.json();
        // Retrieval returns a flat array of {source_url, content}
        const results = Array.isArray(data) ? data : (data?.search_results ?? []);
        if (results.length === 0) {
          return { success: true, message: 'No results found.', data };
        }

        // Return top results as structured content for the LLM to summarize
        const formatted = results.slice(0, 5).map((r: { title?: string; content?: string; source_url?: string }) =>
          `${r.content?.slice(0, 500) ?? ''}\nSource: ${r.source_url ?? 'unknown'}`
        ).join('\n\n---\n\n');

        return { success: true, message: formatted, data };
      } catch (err) {
        return {
          success: false,
          message: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  },
  {
    id: 'deepgram-mcp',
    name: 'Deepgram MCP',
    description: 'Answer technical questions about Deepgram APIs, SDKs, models, features, and products with a full synthesized response and source links. Use this for complex or open-ended questions that need explanation, not just a quick fact lookup.',
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
        const res = await fetch(`${ctx.dxApiUrl}/kapa/chat/`, {
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
