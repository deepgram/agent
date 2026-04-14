import { createWorkletBlobUrl } from "./worklet-source.js";

export interface MicrophoneOptions {
  /** Target sample rate for PCM capture. Default: 16_000 */
  sampleRate?: number;
  /** Passed to getUserMedia. Default: true */
  echoCancellation?: boolean;
  /** Passed to getUserMedia. Default: true */
  noiseSuppression?: boolean;
  /** Passed to getUserMedia. Default: true */
  autoGainControl?: boolean;
}

export type MicrophoneEventMap = {
  "audio-frame": [data: ArrayBuffer];
  error: [err: Error];
};

type Listener<T extends unknown[]> = (...args: T) => void;

export class AgentMicrophone {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;
  private analyser: AnalyserNode | null = null;
  private listeners = new Map<string, Set<Listener<unknown[]>>>();
  private _muted = false;

  constructor(
    private readonly onAudioFrame: (data: ArrayBuffer) => void,
    private readonly options: MicrophoneOptions = {},
  ) {}

  get muted(): boolean {
    return this._muted;
  }

  /**
   * Get current input volume level (0–1) based on audio analysis.
   * Returns 0 when microphone is not active.
   */
  getInputVolume(): number {
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
   * Get frequency domain data for input audio visualization.
   * Returns a Uint8Array of frequency bin magnitudes (0–255).
   */
  getInputByteFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  async start(): Promise<void> {
    if (this.stream) return; // already running

    const {
      sampleRate = 16_000,
      echoCancellation = true,
      noiseSuppression = true,
      autoGainControl = true,
    } = this.options;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation, noiseSuppression, autoGainControl },
    });

    this.ctx = new AudioContext({ sampleRate });
    await this.ctx.resume();

    // Create analyser for input volume/frequency data
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.workletBlobUrl = createWorkletBlobUrl();
    await this.ctx.audioWorklet.addModule(this.workletBlobUrl);

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.ctx, "dg-pcm-capture");

    this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (!this._muted) {
        this.onAudioFrame(e.data);
        this._emit("audio-frame", e.data);
      }
    };

    // source → analyser (for volume data) and source → worklet (for PCM capture)
    source.connect(this.analyser);
    source.connect(this.workletNode);
    // Do NOT connect workletNode to destination — we don't want echo
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage("stop");
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this.analyser = null;
    if (this.ctx) {
      this.ctx.close().catch(() => null);
      this.ctx = null;
    }
    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  mute(): void {
    this._muted = true;
  }

  unmute(): void {
    this._muted = false;
  }

  on<K extends keyof MicrophoneEventMap>(
    event: K,
    listener: Listener<MicrophoneEventMap[K]>,
  ): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener<unknown[]>);
    return this;
  }

  off<K extends keyof MicrophoneEventMap>(
    event: K,
    listener: Listener<MicrophoneEventMap[K]>,
  ): this {
    this.listeners.get(event)?.delete(listener as Listener<unknown[]>);
    return this;
  }

  private _emit<K extends keyof MicrophoneEventMap>(
    event: K,
    ...args: MicrophoneEventMap[K]
  ): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}
