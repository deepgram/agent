import { describe, it, expect } from "bun:test";
import {
  PCM_CAPTURE_WORKLET_SOURCE,
  createWorkletBlobUrl,
} from "../audio/worklet-source.js";

describe("PCM_CAPTURE_WORKLET_SOURCE", () => {
  it("registers the dg-pcm-capture processor", () => {
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain(
      "registerProcessor('dg-pcm-capture'",
    );
  });

  it("contains a class extending AudioWorkletProcessor", () => {
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain(
      "class PCMCaptureProcessor extends AudioWorkletProcessor",
    );
  });

  it("implements Float32→Int16 conversion", () => {
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain("Int16Array");
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain("0x8000");
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain("0x7fff");
  });

  it("handles the stop control message", () => {
    expect(PCM_CAPTURE_WORKLET_SOURCE).toContain("e.data === 'stop'");
  });
});

describe("createWorkletBlobUrl", () => {
  it("returns a blob: URL string", () => {
    const url = createWorkletBlobUrl();
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });

  it("creates unique URLs on each call", () => {
    const url1 = createWorkletBlobUrl();
    const url2 = createWorkletBlobUrl();
    expect(url1).not.toBe(url2);
    URL.revokeObjectURL(url1);
    URL.revokeObjectURL(url2);
  });
});
