import { createWorkletBlobUrl } from "./worklet-source.js";

export interface MicrophoneOptions {
  /**
   * Enable Silero VAD via @ricky0123/vad-web (optional peer dependency).
   * When enabled, audio is gated — only frames during detected speech are
   * forwarded to the agent, and `onSpeechStart`/`onSpeechEnd` fire locally
   * before the server confirms endpointing.
   */
  vad?: boolean | VadOptions;

  /** Target sample rate for PCM capture. Default: 16_000 */
  sampleRate?: number;

  /** Passed to getUserMedia. Default: true */
  echoCancellation?: boolean;

  /** Passed to getUserMedia. Default: true */
  noiseSuppression?: boolean;

  /** Passed to getUserMedia. Default: true */
  autoGainControl?: boolean;
}

export interface VadOptions {
  /**
   * Probability threshold (0–1) for considering a frame as speech.
   * Frames below this threshold are dropped. Default: 0.5
   */
  speechThreshold?: number;

  /**
   * Probability threshold (0–1) at which speech is considered ended.
   * Should be <= speechThreshold. Default: 0.35
   */
  silenceThreshold?: number;
}

export type MicrophoneEventMap = {
  "speech-start": [];
  "speech-end": [];
  "audio-frame": [data: ArrayBuffer];
  error: [err: Error];
};

type Listener<T extends unknown[]> = (...args: T) => void;

/**
 * Browser microphone abstraction for AgentSession.
 *
 * Usage:
 * ```ts
 * const mic = new AgentMicrophone(session, { vad: true });
 * await mic.start();
 * // audio is forwarded to session.sendAudio() automatically
 * mic.stop();
 * ```
 */
export class AgentMicrophone {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;
  private vadInstance: unknown = null;
  private listeners = new Map<string, Set<Listener<unknown[]>>>();
  private _muted = false;

  constructor(
    private readonly onAudioFrame: (data: ArrayBuffer) => void,
    private readonly options: MicrophoneOptions = {},
  ) {}

  get muted(): boolean {
    return this._muted;
  }

  async start(): Promise<void> {
    if (this.stream) return; // already running

    const {
      vad = false,
      sampleRate = 16_000,
      echoCancellation = true,
      noiseSuppression = true,
      autoGainControl = true,
    } = this.options;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation, noiseSuppression, autoGainControl },
    });

    if (vad) {
      await this._startWithVad(vad === true ? {} : vad, sampleRate);
    } else {
      await this._startRaw(sampleRate);
    }
  }

  stop(): void {
    this._teardown();
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

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _emit<K extends keyof MicrophoneEventMap>(
    event: K,
    ...args: MicrophoneEventMap[K]
  ): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  private async _startRaw(sampleRate: number): Promise<void> {
    this.ctx = new AudioContext({ sampleRate });
    await this.ctx.resume();

    this.workletBlobUrl = createWorkletBlobUrl();
    await this.ctx.audioWorklet.addModule(this.workletBlobUrl);

    const source = this.ctx.createMediaStreamSource(this.stream!);
    this.workletNode = new AudioWorkletNode(this.ctx, "dg-pcm-capture");

    this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (!this._muted) {
        this.onAudioFrame(e.data);
        this._emit("audio-frame", e.data);
      }
    };

    source.connect(this.workletNode);
    // Do NOT connect workletNode to destination — we don't want echo
  }

  private async _startWithVad(opts: VadOptions, sampleRate: number): Promise<void> {
    let MicVAD: { new: (options: Record<string, unknown>) => Promise<unknown> };
    try {
      const mod = await import("@ricky0123/vad-web");
      MicVAD = mod.MicVAD as typeof MicVAD;
    } catch {
      throw new Error(
        "@ricky0123/vad-web is required for VAD support. " +
          "Install it: bun add @ricky0123/vad-web onnxruntime-web",
      );
    }

    const { speechThreshold = 0.5, silenceThreshold = 0.35 } = opts;
    let inSpeech = false;

    this.vadInstance = await MicVAD.new({
      stream: this.stream ?? undefined,
      positiveSpeechThreshold: speechThreshold,
      negativeSpeechThreshold: silenceThreshold,
      preSpeechPadFrames: 5,
      minSpeechFrames: 3,

      onSpeechStart: () => {
        inSpeech = true;
        this._emit("speech-start");
      },

      onSpeechEnd: () => {
        inSpeech = false;
        this._emit("speech-end");
      },

      onFrameProcessed: (probabilities: { isSpeech: number }) => {
        // Frame gating: only forward audio when speech is active
        // The underlying frame is already captured by VAD; we use raw PCM
        // from the AudioWorklet we attach separately.
        if (!inSpeech && probabilities.isSpeech < speechThreshold) return;
        // Audio forwarding is handled in the raw worklet path below
      },
    });

    // Also run the raw AudioWorklet so we have Int16 PCM to send to agent
    await this._startRaw(sampleRate);

    // Override the frame handler: only forward when VAD says speech
    this.workletNode!.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (!this._muted && inSpeech) {
        this.onAudioFrame(e.data);
        this._emit("audio-frame", e.data);
      }
    };

    // Start VAD listening
    (this.vadInstance as { start: () => void }).start();
  }

  private _teardown(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage("stop");
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.vadInstance) {
      (this.vadInstance as { destroy: () => Promise<void> }).destroy().catch(() => null);
      this.vadInstance = null;
    }
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
}
