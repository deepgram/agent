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

const EXPIRY_BUFFER_MS = 5_000; // refresh 5s before expiry

interface CachedToken {
  value: string;
  expiresAt: number; // ms epoch, or Infinity if unknown
}

/**
 * Parses the `exp` claim from a JWT without verifying the signature.
 * Returns the expiry as a ms epoch timestamp, or null if unparseable.
 */
function jwtExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    const exp = decoded["exp"];
    if (typeof exp !== "number") return null;
    return exp * 1000; // seconds → ms
  } catch {
    return null;
  }
}

/**
 * Wraps a token factory with an in-memory cache.
 * Expiry is read directly from the JWT `exp` claim so the cache is always
 * accurate regardless of TTL. Falls back to a 25-second default (safe for
 * Deepgram's 30-second short-lived tokens) if the token is not a JWT.
 */
export class CachingTokenFactory {
  private cached: CachedToken | null = null;

  constructor(
    private readonly factory: TokenFactory,
    private readonly fallbackTtlMs = 25_000,
  ) {}

  async get(): Promise<string> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAt - EXPIRY_BUFFER_MS) {
      return this.cached.value;
    }
    const value = await this.factory();
    const expiresAt = jwtExpiresAt(value) ?? (now + this.fallbackTtlMs);
    this.cached = { value, expiresAt };
    return value;
  }

  /** Force invalidation — call before reconnect to guarantee fresh token */
  invalidate(): void {
    this.cached = null;
  }
}
