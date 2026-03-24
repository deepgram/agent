import type { ConsoleAgentConfig } from '../types';
import { getProjectIdFromUrl } from '../utils/state';

export interface DxApiCredentials {
  token: string;
  expiresAt: Date;
}

/**
 * Authenticate through the DX ID token exchange:
 *
 * 1. Get project ID from the current console URL
 * 2. Create a short-lived API key on that project via manage.deepgram.com
 *    (session cookie sent automatically via credentials: 'include')
 * 3. Exchange that key for a dx-id access token via OAuth token exchange
 *    (dx-id encrypts the credential and signs an RS256 JWT)
 */
export async function authenticate(config: ConsoleAgentConfig): Promise<DxApiCredentials> {
  const manageUrl = config.manageUrl ?? 'https://manage.deepgram.com';
  const idServiceUrl = config.idServiceUrl ?? 'https://id.dx.deepgram.com';

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
      time_to_live_in_seconds: 300,
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

  // Step 2: Exchange the temp key for a dx-id access token via OAuth token exchange
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: keyData.key,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    pid: projectId,
  });

  const tokenRes = await fetch(`${idServiceUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => '');
    throw new Error(`dx-id token exchange failed (${tokenRes.status}): ${errBody}`);
  }

  const tokenData: { access_token: string; token_type: string; expires_in: number } =
    await tokenRes.json();

  return {
    token: tokenData.access_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
  };
}
