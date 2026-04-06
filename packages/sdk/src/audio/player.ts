export interface PlayerOptions {
  /**
   * Sample rate of the audio received from the agent.
   * Must match the output.sample_rate in Settings. Default: 24_000
   */
  sampleRate?: number;
}

export class AgentPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private _muted = false;
  private _volume = 1;

  constructor(private readonly options: PlayerOptions = {}) {}

  get muted(): boolean {
    return this._muted;
  }

  get volume(): number {
    return this._volume;
  }

  /**
   * Set playback volume (0–1). Default: 1.
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
  }

  /**
   * Get current output volume level (0–1) based on audio analysis.
   * Returns 0 when not playing.
   */
  getOutputVolume(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 4);
  }

  /**
   * Get frequency domain data for output audio visualization.
   * Returns a Uint8Array of frequency bin magnitudes (0–255).
   */
  getOutputByteFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Decode and queue a raw PCM (Int16 linear16) ArrayBuffer from the agent.
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
    source.connect(this.gainNode!);

    const start = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(start);
    this.nextStartTime = start + buffer.duration;
  }

  /**
   * Seconds of audio still queued for playback (0 when idle).
   */
  getRemainingPlaybackTime(): number {
    if (!this.ctx) return 0;
    return Math.max(0, this.nextStartTime - this.ctx.currentTime);
  }

  /**
   * Interrupt playback immediately — flush all queued audio.
   * Call this when UserStartedSpeaking fires to enable barge-in.
   */
  interrupt(): void {
    if (!this.ctx) return;
    this.ctx.close().catch(() => null);
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
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
    this.analyser = null;
    this.gainNode = null;
  }

  private _ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: this.options.sampleRate ?? 24_000 });
      this.nextStartTime = 0;

      // Create gain node for volume control
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this._volume;

      // Create analyser for volume/frequency data
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      // Chain: source → gain → analyser → destination
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => null);
    }
    return this.ctx;
  }
}
