import { jest } from "bun:test";
import EventEmitter from "eventemitter3";

/**
 * A mock V1Socket that extends EventEmitter so tests can simulate
 * server events (open, close, message, error) via emit().
 */
export function createMockSocket() {
  const emitter = new EventEmitter();

  const socket = {
    // EventEmitter-based — tests call socket.emit("open") to simulate events
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      emitter.on(event, handler);
      return socket;
    }),
    off: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      emitter.off(event, handler);
      return socket;
    }),
    removeAllListeners: jest.fn((event?: string) => {
      if (event) emitter.removeAllListeners(event);
      else emitter.removeAllListeners();
      return socket;
    }),

    // Lifecycle
    connect: jest.fn(),
    close: jest.fn(),

    // Send methods
    sendSettings: jest.fn(),
    sendMedia: jest.fn(),
    sendKeepAlive: jest.fn(),
    sendUpdateSpeak: jest.fn(),
    sendUpdateThink: jest.fn(),
    sendUpdatePrompt: jest.fn(),
    sendInjectUserMessage: jest.fn(),
    sendInjectAgentMessage: jest.fn(),
    sendFunctionCallResponse: jest.fn(),

    // The inner WebSocket ref (for binaryType)
    socket: { binaryType: "blob" as string },

    // Test helper — simulate server events
    _emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args),
  };

  return socket;
}

export type MockSocket = ReturnType<typeof createMockSocket>;

/**
 * Create a mock DeepgramClient that returns the given mock socket.
 * Auto-opens the socket on connect() to simulate a successful handshake.
 */
export function createMockDeepgramClient(mockSocket: MockSocket, autoOpen = true) {
  // When socket.connect() is called, schedule an immediate "open" event
  if (autoOpen) {
    mockSocket.connect.mockImplementation(() => {
      // Use queueMicrotask so the open fires after the Promise race is set up
      queueMicrotask(() => mockSocket._emit("open"));
    });
  }

  return {
    agent: {
      v1: {
        connect: jest.fn(async () => mockSocket),
      },
    },
  };
}
