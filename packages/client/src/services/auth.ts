import type { ConsoleAgentConfig } from '../types';
import { getProjectIdFromUrl } from '../utils/state';

export interface DxApiCredentials {
  token: string;
  expiresAt: Date;
}

/**
 * Authenticate through the DX API auth chain:
 *
 * 1. Get project ID from the current console URL
 * 2. Create a short-lived API key on that project via manage.deepgram.com
 *    (session cookie sent automatically via credentials: 'include')
 * 3. Exchange that key for a dx-api wrapper JWT
 *    (dx-api embeds a service credential instead of the temp key)
 */
export async function authenticate(config: ConsoleAgentConfig): Promise<DxApiCredentials> {
  const manageUrl = config.manageUrl ?? 'https://manage.deepgram.com';
  const dxApiUrl = config.dxApiUrl ?? 'https://api.dx.deepgram.com';

  const projectId = config.projectId ?? getProjectIdFromUrl();
  if (!projectId) {
    throw new Error('No project ID available — navigate to a project first');
  }

  // Step 1: Create a short-lived API key on the current project
  const keyRes = await fetch(`${manageUrl}/v1/projects/${projectId}/keys`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment: 'Console Agent Widget',
      scopes: ['member'],
      tags: ['console-agent'],
      time_to_live_in_seconds: 3600,
    }),
  });

  if (!keyRes.ok) {
    const body = await keyRes.text().catch(() => '');
    throw new Error(`Failed to create session key (${keyRes.status}): ${body}`);
  }

  const keyData: { key: string } = await keyRes.json();
  if (!keyData.key) {
    throw new Error('No key returned from manage API');
  }

  // Step 2: Exchange the temp key for a dx-api wrapper JWT
  const tokenRes = await fetch(`${dxApiUrl}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${keyData.key}`,
      'X-DX-Auth-Mode': 'session',
    },
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    throw new Error(`dx-api auth/token failed (${tokenRes.status}): ${body}`);
  }

  const tokenData: { token: string; expires_at: string } = await tokenRes.json();

  return {
    token: tokenData.token,
    expiresAt: new Date(tokenData.expires_at),
  };
}
