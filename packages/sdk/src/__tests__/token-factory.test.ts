import { describe, it, expect, beforeEach, jest } from "bun:test";
import { resolveTokenFactory, CachingTokenFactory } from "../token/factory.js";

describe("resolveTokenFactory", () => {
  it("wraps an apiKey into a factory that always returns the key", async () => {
    const factory = resolveTokenFactory({ apiKey: "dg-test-key" });
    expect(await factory()).toBe("dg-test-key");
    expect(await factory()).toBe("dg-test-key");
  });

  it("returns the caller-supplied tokenFactory as-is", async () => {
    const custom = async () => "custom-token";
    const factory = resolveTokenFactory({ tokenFactory: custom });
    expect(factory).toBe(custom);
  });
});

describe("CachingTokenFactory", () => {
  let callCount: number;
  let tokenValue: string;
  let factory: CachingTokenFactory;

  beforeEach(() => {
    callCount = 0;
    tokenValue = "token-1";
    factory = new CachingTokenFactory(async () => {
      callCount++;
      return tokenValue;
    });
  });

  it("calls the underlying factory on first get()", async () => {
    const token = await factory.get();
    expect(token).toBe("token-1");
    expect(callCount).toBe(1);
  });

  it("returns cached token on subsequent calls within TTL", async () => {
    await factory.get();
    tokenValue = "token-2";
    const token = await factory.get();
    expect(token).toBe("token-1");
    expect(callCount).toBe(1);
  });

  it("fetches a new token after fallback TTL minus 5s buffer expires", async () => {
    const shortTtl = new CachingTokenFactory(async () => {
      callCount++;
      return tokenValue;
    }, 30_000); // 30s fallback TTL (non-JWT token)

    await shortTtl.get();
    expect(callCount).toBe(1);

    // Advance past (TTL - 5s buffer) = 25s
    const originalNow = Date.now;
    Date.now = () => originalNow() + 26_000;
    try {
      tokenValue = "token-2";
      const token = await shortTtl.get();
      expect(token).toBe("token-2");
      expect(callCount).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });

  it("returns cached token before the buffer window", async () => {
    const shortTtl = new CachingTokenFactory(async () => {
      callCount++;
      return tokenValue;
    }, 30_000); // 30s fallback TTL (non-JWT token)

    await shortTtl.get();

    // Advance 20s — still within (TTL - 5s buffer) = 25s window
    const originalNow = Date.now;
    Date.now = () => originalNow() + 20_000;
    try {
      const token = await shortTtl.get();
      expect(token).toBe("token-1");
      expect(callCount).toBe(1);
    } finally {
      Date.now = originalNow;
    }
  });

  it("invalidate() forces the next get() to call factory", async () => {
    await factory.get();
    expect(callCount).toBe(1);

    factory.invalidate();
    tokenValue = "token-fresh";
    const token = await factory.get();
    expect(token).toBe("token-fresh");
    expect(callCount).toBe(2);
  });

  it("uses default fallback TTL of 25s for non-JWT tokens", async () => {
    await factory.get();

    // Advance 20s — within (25s fallback TTL - 5s buffer = 20s window)
    const originalNow = Date.now;
    Date.now = () => originalNow() + 19_000;
    try {
      const token = await factory.get();
      expect(token).toBe("token-1");
      expect(callCount).toBe(1);
    } finally {
      Date.now = originalNow;
    }

    // Advance past 20s — should refresh
    Date.now = () => originalNow() + 21_000;
    try {
      tokenValue = "token-expired";
      const token = await factory.get();
      expect(token).toBe("token-expired");
      expect(callCount).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });

  it("reads expiry from JWT exp claim directly", async () => {
    // Build a minimal JWT with exp = now + 60s
    const originalNow = Date.now;
    const base = originalNow();
    const exp = Math.floor((base + 60_000) / 1000);
    const payload = btoa(JSON.stringify({ exp })).replace(/=/g, "");
    const jwtToken = `header.${payload}.sig`;

    const jwtFactory = new CachingTokenFactory(async () => {
      callCount++;
      return jwtToken;
    });

    await jwtFactory.get();
    expect(callCount).toBe(1);

    // Advance 54s — within (60s exp - 5s buffer = 55s window)
    Date.now = () => base + 54_000;
    try {
      const token = await jwtFactory.get();
      expect(token).toBe(jwtToken);
      expect(callCount).toBe(1);
    } finally {
      Date.now = originalNow;
    }

    // Advance 56s — past (exp - buffer), should refresh
    Date.now = () => base + 56_000;
    try {
      const token = await jwtFactory.get();
      // factory still returns jwtToken — callCount increments
      expect(callCount).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });
});
