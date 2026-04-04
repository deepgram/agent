/**
 * Browser audio player for agent speech output.
 *
 * Receives raw PCM (Int16, linear16) from the agent WebSocket, decodes it,
 * and plays it via the Web Audio API. Handles:
 * - Queue-based playback with seamless scheduling
 * - Interrupt on user barge-in (flush pending audio)
 * - Output mute toggle
 */
export interface PlayerOptions {
  /**
   * Sample rate of the audio received from the agent.
   * Must match the output.sample_rate in Settings. Default: 24_000
   */
  sampleRate?: number;
}

export class AgentPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private _muted = false;

  constructor(private readonly options: PlayerOptions = {}) {}

  get muted(): boolean {
    return this._muted;
  }

  /**
   * Decode and queue an Int16 PCM chunk received from the agent.
   * Chunks are scheduled to play back-to-back without gaps.
   */
  queue(data: ArrayBuffer): void {
    if (this._muted) return;

    const ctx = this._ensureContext();
    const sampleRate = this.options.sampleRate ?? 24_000;

    const int16 = new Int16Array(data);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const start = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(start);
    this.nextStartTime = start + buffer.duration;
  }

  /**
   * Interrupt playback immediately — flush all queued audio.
   * Call this when UserStartedSpeaking fires to enable barge-in.
   */
  interrupt(): void {
    if (!this.ctx) return;
    // Closing and re-creating the AudioContext is the most reliable flush.
    this.ctx.close().catch(() => null);
    this.ctx = null;
    this.nextStartTime = 0;
  }

  mute(): void {
    this._muted = true;
    this.interrupt();
  }

  unmute(): void {
    this._muted = false;
  }

  dispose(): void {
    this.ctx?.close().catch(() => null);
    this.ctx = null;
  }

  private _ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: this.options.sampleRate ?? 24_000 });
      this.nextStartTime = 0;
    }
    return this.ctx;
  }
}
