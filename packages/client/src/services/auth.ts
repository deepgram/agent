import type { ConsoleAgentConfig } from '../types';

export interface DxApiCredentials {
  token: string;
  expiresAt: Date;
}

/**
 * Authenticate through the DX API auth chain:
 *
 * 1. Session cookie → manage.deepgram.com/v1/auth/grant → temporary access_token
 * 2. access_token → api.dx.deepgram.com/auth/token → custom JWT
 *
 * The session cookie is sent automatically (httpOnly, *.deepgram.com wildcard).
 */
export async function authenticate(config: ConsoleAgentConfig): Promise<DxApiCredentials> {
  const manageUrl = config.manageUrl ?? 'https://manage.deepgram.com';
  const dxApiUrl = config.dxApiUrl ?? 'https://api.dx.deepgram.com';

  // Step 1: Exchange session cookie for a temporary scoped credential via auth/grant
  const grantRes = await fetch(`${manageUrl}/v1/auth/grant`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!grantRes.ok) {
    const body = await grantRes.text().catch(() => '');
    throw new Error(`auth/grant failed (${grantRes.status}): ${body}`);
  }

  const grant: { access_token: string; expires_in: number } = await grantRes.json();

  // Step 2: Exchange the temporary credential for a DX API JWT
  const tokenRes = await fetch(`${dxApiUrl}/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Token ${grant.access_token}` },
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
