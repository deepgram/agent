import { jest } from "bun:test";

/**
 * Creates a mock AudioBuffer that tracks copyToChannel calls.
 */
export function createMockAudioBuffer(length: number, sampleRate: number) {
  const channelData = new Float32Array(length);
  return {
    length,
    sampleRate,
    duration: length / sampleRate,
    numberOfChannels: 1,
    getChannelData: jest.fn(() => channelData),
    copyToChannel: jest.fn((source: Float32Array) => {
      channelData.set(source);
    }),
  };
}

/**
 * Creates a mock AudioBufferSourceNode.
 */
export function createMockBufferSource() {
  return {
    buffer: null as unknown,
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
  };
}

/**
 * Creates a mock AudioContext with controllable state.
 */
export function createMockAudioContext(sampleRate = 24_000) {
  let state: AudioContextState = "running";
  const bufferSources: ReturnType<typeof createMockBufferSource>[] = [];

  const ctx = {
    get state() { return state; },
    sampleRate,
    currentTime: 0,
    destination: {},
    createBuffer: jest.fn((channels: number, length: number, sr: number) =>
      createMockAudioBuffer(length, sr),
    ),
    createBufferSource: jest.fn(() => {
      const source = createMockBufferSource();
      bufferSources.push(source);
      return source;
    }),
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createGain: jest.fn(() => ({
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createAnalyser: jest.fn(() => ({
      fftSize: 256,
      frequencyBinCount: 128,
      getByteTimeDomainData: jest.fn((arr: Uint8Array) => arr.fill(128)),
      getByteFrequencyData: jest.fn((arr: Uint8Array) => arr.fill(0)),
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    resume: jest.fn(() => {
      state = "running";
      return Promise.resolve();
    }),
    close: jest.fn(() => {
      state = "closed";
      return Promise.resolve();
    }),
    audioWorklet: {
      addModule: jest.fn(() => Promise.resolve()),
    },
    _bufferSources: bufferSources,
    _setState(s: AudioContextState) { state = s; },
  };

  return ctx;
}

/**
 * Creates a mock MediaStream with stoppable tracks.
 */
export function createMockMediaStream() {
  const tracks = [{ stop: jest.fn(), kind: "audio" }];
  return {
    getTracks: jest.fn(() => tracks),
    _tracks: tracks,
  };
}

/**
 * Creates a mock AudioWorkletNode with a controllable port.
 */
export function createMockAudioWorkletNode() {
  return {
    port: {
      onmessage: null as ((e: MessageEvent) => void) | null,
      postMessage: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
}

/**
 * Install global mocks for navigator.mediaDevices and AudioContext.
 * Returns cleanup function.
 */
export function installBrowserAudioMocks() {
  const mockCtx = createMockAudioContext(16_000);
  const mockStream = createMockMediaStream();
  const mockWorkletNode = createMockAudioWorkletNode();

  const origAudioContext = globalThis.AudioContext;
  const origAudioWorkletNode = globalThis.AudioWorkletNode;
  const origNavigator = globalThis.navigator;

  // @ts-expect-error — mock constructor
  globalThis.AudioContext = jest.fn(() => mockCtx);
  // @ts-expect-error — mock constructor
  globalThis.AudioWorkletNode = jest.fn(() => mockWorkletNode);

  Object.defineProperty(globalThis, "navigator", {
    value: {
      ...origNavigator,
      mediaDevices: {
        getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
      },
    },
    writable: true,
    configurable: true,
  });

  return {
    mockCtx,
    mockStream,
    mockWorkletNode,
    cleanup() {
      globalThis.AudioContext = origAudioContext;
      globalThis.AudioWorkletNode = origAudioWorkletNode;
      Object.defineProperty(globalThis, "navigator", {
        value: origNavigator,
        writable: true,
        configurable: true,
      });
    },
  };
}
