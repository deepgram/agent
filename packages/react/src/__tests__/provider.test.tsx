import React from "react";
import { describe, it, expect, beforeEach } from "bun:test";
import { render, act } from "@testing-library/react";

import { resetMocks, lastSession, lastPlayer, lastMicrophone } from "./helpers/mock-sdk.js";
import { TestProvider } from "./helpers/test-wrapper.js";

const { useAgentState } = await import("../hooks/useAgentState.js");
const { useAgentConversation } = await import("../hooks/useAgentConversation.js");

// Helper component to extract context values
function StateReader({ onState }: { onState: (s: ReturnType<typeof useAgentState>) => void }) {
  const state = useAgentState();
  onState(state);
  return null;
}

function ConversationReader({ onConversation }: { onConversation: (c: ReturnType<typeof useAgentConversation>) => void }) {
  const conv = useAgentConversation();
  onConversation(conv);
  return null;
}

describe("AgentProvider", () => {
  beforeEach(resetMocks);

  describe("session creation", () => {
    it("creates an AgentSession on mount", () => {
      render(
        <TestProvider>
          <div />
        </TestProvider>,
      );
      expect(lastSession).toBeDefined();
      expect(lastSession.connect).toBeDefined();
    });

    it("creates an AgentPlayer when tts={true}", () => {
      render(
        <TestProvider tts={true}>
          <div />
        </TestProvider>,
      );
      expect(lastPlayer).toBeDefined();
    });

    it("does not create an AgentPlayer when tts={false}", () => {
      render(
        <TestProvider tts={false}>
          <div />
        </TestProvider>,
      );
      expect(lastPlayer).toBeUndefined();
    });
  });

  describe("state events", () => {
    it("updates state on session events", () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      expect(currentState!.state).toBe("idle");

      act(() => {
        lastSession.state = "connecting";
        lastSession.emit("connecting");
      });
      expect(currentState!.state).toBe("connecting");

      act(() => {
        lastSession.state = "connected";
        lastSession.emit("connected");
      });
      expect(currentState!.state).toBe("connected");
    });

    it("updates state on disconnected event", () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      act(() => {
        lastSession.state = "disconnected";
        lastSession.emit("disconnected", "test");
      });
      expect(currentState!.state).toBe("disconnected");
    });
  });

  describe("conversation events", () => {
    it("appends messages on conversation-text events", () => {
      let conv: ReturnType<typeof useAgentConversation> | undefined;
      render(
        <TestProvider>
          <ConversationReader onConversation={(c) => { conv = c; }} />
        </TestProvider>,
      );

      expect(conv!.conversation).toHaveLength(0);

      act(() => {
        lastSession.emit("conversation-text", {
          type: "ConversationText",
          role: "assistant",
          content: "Hello!",
        });
      });

      expect(conv!.conversation).toHaveLength(1);
      expect(conv!.conversation[0].role).toBe("assistant");
      expect(conv!.conversation[0].content).toBe("Hello!");

      act(() => {
        lastSession.emit("conversation-text", {
          type: "ConversationText",
          role: "user",
          content: "Hi there",
        });
      });

      expect(conv!.conversation).toHaveLength(2);
    });
  });

  describe("audio routing", () => {
    it("queues audio to player on audio events", () => {
      render(
        <TestProvider>
          <div />
        </TestProvider>,
      );

      const audioData = new ArrayBuffer(480);
      act(() => {
        lastSession.emit("audio", audioData);
      });

      expect(lastPlayer.queue).toHaveBeenCalledWith(audioData);
    });

    it("interrupts player on user-started-speaking", () => {
      render(
        <TestProvider>
          <div />
        </TestProvider>,
      );

      act(() => {
        lastSession.emit("user-started-speaking", {
          type: "UserStartedSpeaking",
        });
      });

      expect(lastPlayer.interrupt).toHaveBeenCalled();
    });

    it("does not queue audio when tts={false}", () => {
      render(
        <TestProvider tts={false}>
          <div />
        </TestProvider>,
      );

      act(() => {
        lastSession.emit("audio", new ArrayBuffer(480));
      });

      // No player was created, so queue was never called
      expect(lastPlayer).toBeUndefined();
    });
  });

  describe("lifecycle", () => {
    it("start() calls session.connect()", async () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      await act(async () => {
        await currentState!.start();
      });

      expect(lastSession.connect).toHaveBeenCalled();
    });

    it("stop() calls session.disconnect()", async () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      await act(async () => {
        await currentState!.start();
      });

      act(() => {
        currentState!.stop();
      });

      expect(lastSession.disconnect).toHaveBeenCalled();
    });

    it("start() creates and starts microphone when microphone={true}", async () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider microphone={true}>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      await act(async () => {
        await currentState!.start();
      });

      expect(lastMicrophone).toBeDefined();
      expect(lastMicrophone.start).toHaveBeenCalled();
    });

    it("start() does not create microphone when microphone={false}", async () => {
      let currentState: ReturnType<typeof useAgentState> | undefined;
      render(
        <TestProvider microphone={false}>
          <StateReader onState={(s) => { currentState = s; }} />
        </TestProvider>,
      );

      await act(async () => {
        await currentState!.start();
      });

      expect(lastMicrophone).toBeUndefined();
    });

    it("cleanup on unmount removes listeners and disposes", () => {
      const { unmount } = render(
        <TestProvider>
          <div />
        </TestProvider>,
      );

      unmount();

      // removeAllListeners comes from the real EventEmitter, so check
      // that no listeners remain after unmount
      expect(lastSession.eventNames()).toHaveLength(0);
      expect(lastSession.disconnect).toHaveBeenCalled();
      expect(lastPlayer.dispose).toHaveBeenCalled();
    });
  });

  describe("sendUserMessage", () => {
    it("delegates to session.injectUserMessage", () => {
      let conv: ReturnType<typeof useAgentConversation> | undefined;
      render(
        <TestProvider>
          <ConversationReader onConversation={(c) => { conv = c; }} />
        </TestProvider>,
      );

      act(() => {
        conv!.sendUserMessage("Hello agent");
      });

      expect(lastSession.injectUserMessage).toHaveBeenCalledWith("Hello agent");
    });
  });
});
