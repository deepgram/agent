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

  it("fetches a new token after TTL minus 60s buffer expires", async () => {
    const shortTtl = new CachingTokenFactory(async () => {
      callCount++;
      return tokenValue;
    }, 120_000); // 2 minute TTL

    await shortTtl.get();
    expect(callCount).toBe(1);

    // Advance past (TTL - 60s buffer) = 60s
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;
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
    }, 120_000); // 2 minute TTL

    await shortTtl.get();

    // Advance 50s — still within (TTL - 60s buffer) = 60s window
    const originalNow = Date.now;
    Date.now = () => originalNow() + 50_000;
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

  it("uses default TTL of 4 minutes", async () => {
    await factory.get();

    // Advance 3 minutes (within default 4min TTL minus 60s buffer = 3min)
    const originalNow = Date.now;
    Date.now = () => originalNow() + 170_000; // 2m50s — within window
    try {
      const token = await factory.get();
      expect(token).toBe("token-1");
      expect(callCount).toBe(1);
    } finally {
      Date.now = originalNow;
    }

    // Advance past 3 minutes (TTL - buffer = 240_000 - 60_000 = 180_000)
    Date.now = () => originalNow() + 181_000;
    try {
      tokenValue = "token-expired";
      const token = await factory.get();
      expect(token).toBe("token-expired");
      expect(callCount).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });
});
