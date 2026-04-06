import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { AgentPlayer } from "../audio/player.js";
import { createMockAudioContext, createMockAudioBuffer } from "./helpers/audio-mocks.js";

describe("AgentPlayer", () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;
  let origAudioContext: typeof globalThis.AudioContext;

  beforeEach(() => {
    mockCtx = createMockAudioContext(24_000);
    origAudioContext = globalThis.AudioContext;
    // @ts-expect-error — mock constructor
    globalThis.AudioContext = jest.fn(() => mockCtx);
  });

  afterEach(() => {
    globalThis.AudioContext = origAudioContext;
  });

  function createInt16Buffer(values: number[]): ArrayBuffer {
    return new Int16Array(values).buffer;
  }

  describe("queue()", () => {
    it("converts Int16 PCM to Float32 correctly", () => {
      const player = new AgentPlayer();
      // Max positive, max negative, zero
      const data = createInt16Buffer([32767, -32768, 0]);

      player.queue(data);

      // Verify createBuffer was called
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(1, 3, 24_000);

      // Verify copyToChannel was called with correct Float32 conversion
      const buffer = mockCtx.createBuffer.mock.results[0].value;
      const copyCall = buffer.copyToChannel.mock.calls[0][0] as Float32Array;

      // 32767 / 0x7fff = 1.0
      expect(copyCall[0]).toBeCloseTo(1.0, 5);
      // -32768 / 0x8000 = -1.0
      expect(copyCall[1]).toBeCloseTo(-1.0, 5);
      // 0 / 0x7fff = 0
      expect(copyCall[2]).toBeCloseTo(0, 5);
    });

    it("uses configured sample rate", () => {
      const player = new AgentPlayer({ sampleRate: 16_000 });
      player.queue(createInt16Buffer([100]));
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(1, 1, 16_000);
    });

    it("schedules sources at consecutive start times", () => {
      const player = new AgentPlayer();

      // Queue two buffers
      player.queue(createInt16Buffer([1, 2, 3]));
      player.queue(createInt16Buffer([4, 5, 6]));

      const sources = mockCtx._bufferSources;
      expect(sources).toHaveLength(2);

      // First source starts at max(currentTime=0, nextStartTime=0) = 0
      expect(sources[0].start).toHaveBeenCalledWith(0);

      // Second source starts after first buffer's duration
      const firstDuration = 3 / 24_000;
      expect(sources[1].start).toHaveBeenCalledWith(firstDuration);
    });

    it("does not queue audio when muted", () => {
      const player = new AgentPlayer();
      player.mute();

      player.queue(createInt16Buffer([1, 2, 3]));

      expect(mockCtx.createBuffer).not.toHaveBeenCalled();
    });

    it("resumes suspended AudioContext", () => {
      mockCtx._setState("suspended");
      const player = new AgentPlayer();
      player.queue(createInt16Buffer([1]));
      expect(mockCtx.resume).toHaveBeenCalled();
    });
  });

  describe("interrupt()", () => {
    it("closes the AudioContext and resets timing", () => {
      const player = new AgentPlayer();
      player.queue(createInt16Buffer([1])); // creates context
      player.interrupt();

      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("is safe to call with no context", () => {
      const player = new AgentPlayer();
      expect(() => player.interrupt()).not.toThrow();
    });
  });

  describe("mute/unmute", () => {
    it("mute() sets muted flag and calls interrupt", () => {
      const player = new AgentPlayer();
      player.queue(createInt16Buffer([1])); // creates context

      player.mute();
      expect(player.muted).toBe(true);
      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("unmute() clears muted flag", () => {
      const player = new AgentPlayer();
      player.mute();
      player.unmute();
      expect(player.muted).toBe(false);
    });
  });

  describe("dispose()", () => {
    it("closes the AudioContext", () => {
      const player = new AgentPlayer();
      player.queue(createInt16Buffer([1]));
      player.dispose();
      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("is safe to call with no context", () => {
      const player = new AgentPlayer();
      expect(() => player.dispose()).not.toThrow();
    });
  });

  describe("_ensureContext()", () => {
    it("creates a new context when closed", () => {
      const player = new AgentPlayer();
      player.queue(createInt16Buffer([1])); // creates context
      mockCtx._setState("closed");

      // Queue again — should create new context
      player.queue(createInt16Buffer([2]));
      expect(globalThis.AudioContext).toHaveBeenCalledTimes(2);
    });
  });
});
