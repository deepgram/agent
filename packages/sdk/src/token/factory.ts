import type { AuthConfig, TokenFactory } from "../types/config.js";

/**
 * Resolves an AuthConfig to a normalised token factory.
 * - For `{ apiKey }`: always returns the same key.
 * - For `{ tokenFactory }`: delegates to the caller-supplied factory.
 */
export function resolveTokenFactory(auth: AuthConfig): TokenFactory {
  if ("apiKey" in auth) {
    return () => Promise.resolve(auth.apiKey);
  }
  return auth.tokenFactory;
}

const EXPIRY_BUFFER_MS = 60_000;

interface CachedToken {
  value: string;
  expiresAt: number; // ms epoch, or Infinity if unknown
}

/**
 * Wraps a token factory with an in-memory cache.
 * Tokens are considered valid until `ttlMs` before their expiry.
 * If the factory doesn't provide expiry information, tokens are cached for
 * `defaultTtlMs` (default: 4 minutes — safe for Deepgram's 5-min short-lived keys).
 */
export class CachingTokenFactory {
  private cached: CachedToken | null = null;

  constructor(
    private readonly factory: TokenFactory,
    private readonly defaultTtlMs = 4 * 60 * 1000,
  ) {}

  async get(): Promise<string> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAt - EXPIRY_BUFFER_MS) {
      return this.cached.value;
    }
    const value = await this.factory();
    this.cached = { value, expiresAt: now + this.defaultTtlMs };
    return value;
  }

  /** Force invalidation — call before reconnect to guarantee fresh token */
  invalidate(): void {
    this.cached = null;
  }
}
