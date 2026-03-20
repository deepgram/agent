import type { Skill, SourceLink } from '../types';

/**
 * Deepgram knowledge tools — answer technical questions via Kapa-backed
 * endpoints on dx-api.
 *
 * - deepgram-mcp: fast semantic retrieval (default — used for most questions)
 * - deepgram-mcp-chat: full LLM-synthesized answer (for complex questions)
 *
 * Both return source links as visual-only content for the chat UI.
 * The LLM never sees URLs — it gets text content and knows to say
 * "I've shared some links in the chat" instead of reading them aloud.
 */
export const deepgramMcpSkills: Skill[] = [
  {
    id: 'deepgram-mcp',
    name: 'Deepgram MCP',
    description: 'Search Deepgram documentation for relevant information. Use this for any technical question about Deepgram APIs, SDKs, models, features, pricing, or supported languages. Returns relevant documentation excerpts with source links shown in the chat.',
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
        const res = await fetch(`${ctx.dxApiUrl}/kapa/retrieval`, {
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
        const results: Array<{ source_url?: string; content?: string }> =
          Array.isArray(data) ? data : [];

        if (results.length === 0) {
          return { success: true, message: 'No results found for that query.' };
        }

        // Text content for the LLM — no URLs
        const textContent = results.slice(0, 5).map((r) =>
          r.content?.slice(0, 600) ?? ''
        ).join('\n\n---\n\n');

        // Source links for the chat UI — never spoken by TTS
        const uniqueUrls = new Set<string>();
        const sources: SourceLink[] = results
          .filter((r) => {
            if (!r.source_url || uniqueUrls.has(r.source_url)) return false;
            uniqueUrls.add(r.source_url);
            return true;
          })
          .slice(0, 5)
          .map((r) => ({
            title: extractTitle(r.source_url!, r.content),
            url: r.source_url!,
          }));

        // Pick a CTA from the top result if it's a docs/guide page
        const cta = pickCta(results[0]);

        // Remove the CTA URL from sources to avoid duplication
        const filteredSources = cta
          ? sources.filter((s) => s.url !== cta.url)
          : sources;

        // Tell the LLM about the links without including URLs
        let linkHint = '';
        if (sources.length > 0) {
          linkHint += `\n\n[${sources.length} source link(s) are shown in the chat for the user to click.]`;
        }
        if (cta) {
          linkHint += `\n[A docs link button is shown to the user. End your response with [CTA: <short label max 40 chars>] to set the button text. Keep it concise like "Getting Started with STT" or "Streaming API Guide".]`;
        }

        return {
          success: true,
          message: textContent + linkHint,
          data,
          sources: filteredSources,
          cta,
        };
      } catch (err) {
        return {
          success: false,
          message: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  },
  {
    id: 'deepgram-mcp-chat',
    name: 'Deepgram MCP Chat',
    description: 'Get a detailed, synthesized answer about Deepgram with source citations. Use this only for complex or open-ended questions that need a thorough explanation — it is slower than the default deepgram-mcp tool.',
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
        const answer: string = data?.answer ?? data?.text ?? JSON.stringify(data);

        // Strip markdown URLs from the answer text so TTS doesn't read them
        const spokenAnswer = answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        // Extract source links for the chat UI
        const sources: SourceLink[] = (data?.relevant_sources ?? [])
          .slice(0, 5)
          .map((s: { title?: string; source_url?: string }) => ({
            title: s.title?.split('|')[0]?.trim() ?? 'Source',
            url: s.source_url ?? '',
          }))
          .filter((s: SourceLink) => s.url);

        // Pick a CTA from the top source if it's a docs page
        const cta = sources.length > 0 && isDocsUrl(sources[0].url)
          ? { title: `Read: ${sources[0].title}`, url: sources[0].url }
          : undefined;

        const filteredSources = cta
          ? sources.filter((s) => s.url !== cta.url)
          : sources;

        let linkHint = '';
        if (sources.length > 0) {
          linkHint += `\n\n[${sources.length} source link(s) are shown in the chat for the user to click.]`;
        }
        if (cta) {
          linkHint += `\n[A docs link button is shown to the user. End your response with [CTA: <short label max 40 chars>] to set the button text. Keep it concise like "Getting Started with STT" or "Streaming API Guide".]`;
        }

        return {
          success: true,
          message: spokenAnswer + linkHint,
          data,
          sources: filteredSources,
          cta,
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed to query Deepgram MCP: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  },
];

/** URLs that are good candidates for a prominent CTA button */
const DOCS_PATTERNS = [
  'developers.deepgram.com/docs/',
  'developers.deepgram.com/reference/',
];

function isDocsUrl(url: string): boolean {
  return DOCS_PATTERNS.some((p) => url.includes(p));
}

/** Pick a CTA from the top retrieval result if it's a docs/guide page */
function pickCta(
  result: { source_url?: string; content?: string } | undefined,
): SourceLink | undefined {
  if (!result?.source_url || !isDocsUrl(result.source_url)) return undefined;
  const title = extractTitle(result.source_url, result.content);
  return { title: `${title} — Read the docs`, url: result.source_url };
}

/** Extract a human-readable title from a URL and optional content */
function extractTitle(url: string, content?: string): string {
  if (content) {
    // Try the first heading, taking the most specific breadcrumb part
    const heading = content.match(/^#+ (.+)$/m);
    if (heading) {
      const parts = heading[1].split('>').map((s) => s.trim());
      // Find the most meaningful segment (skip generic ones like "Docs")
      const meaningful = parts.find((p) =>
        p.length > 3 && !/^(docs|reference|api|home)$/i.test(p)
      );
      if (meaningful) return meaningful;
    }
    // Try a ## subheading if the top heading was generic
    const subheading = content.match(/^## (.+)$/m);
    if (subheading && subheading[1].length > 3) {
      return subheading[1].trim();
    }
  }
  // Fall back to URL path — take the last meaningful segment
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    // Walk backwards to find a segment that isn't too short or generic
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (seg.length > 3 && !/^(docs|reference|api|v1|v2)$/i.test(seg)) {
        return seg.replace(/[-_]/g, ' ').replace(/(^|\s)\w/g, (c) => c.toUpperCase());
      }
    }
    const last = segments[segments.length - 1] ?? 'Documentation';
    return last.replace(/[-_]/g, ' ').replace(/(^|\s)\w/g, (c) => c.toUpperCase());
  } catch {
    return 'Documentation';
  }
}
