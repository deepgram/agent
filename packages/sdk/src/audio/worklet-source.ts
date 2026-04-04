/**
 * AudioWorklet processor source — inlined as a string so it can be loaded via
 * a Blob URL without needing a separate static file (critical for bundled libs).
 *
 * Converts Float32 PCM from the AudioWorklet input to Int16 (linear16) and
 * posts each frame buffer back to the main thread via the MessagePort.
 */
export const PCM_CAPTURE_WORKLET_SOURCE = /* js */ `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;
    this.port.onmessage = (e) => {
      if (e.data === 'stop') this._active = false;
    };
  }

  process(inputs) {
    if (!this._active) return false;
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('dg-pcm-capture', PCMCaptureProcessor);
`;

/** Creates a Blob URL for the worklet source that can be passed to addModule(). */
export function createWorkletBlobUrl(): string {
  const blob = new Blob([PCM_CAPTURE_WORKLET_SOURCE], {
    type: "application/javascript",
  });
  return URL.createObjectURL(blob);
}
