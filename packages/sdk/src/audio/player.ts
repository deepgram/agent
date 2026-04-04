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
   * Decode and queue a raw PCM (Int16 linear16) ArrayBuffer from the agent.
   * The SDK sets binaryType:'arraybuffer' on the WebSocket so no conversion
   * is needed — the data arrives ready to use.
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
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => null);
    }
    return this.ctx;
  }
}
