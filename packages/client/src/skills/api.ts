import type { SkillContext, SkillResult } from '../types';

/**
 * Make an API call to the console backend.
 * Uses the same auth token the Elm app uses (stored in cookies).
 */
export async function apiCall(
  ctx: SkillContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<SkillResult> {
  const base = ctx.apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/v1${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        message: `API error (${res.status}): ${text || res.statusText}`,
      };
    }

    // Some DELETE endpoints return no body
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return { success: true, message: 'Done.' };
    }

    const data = await res.json();
    return { success: true, message: 'Success.', data };
  } catch (err) {
    return {
      success: false,
      message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
