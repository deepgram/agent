import React from "react";
import { describe, it, expect, beforeEach } from "bun:test";
import { render, act } from "@testing-library/react";

import { resetMocks, lastSession, lastPlayer, lastMicrophone } from "../helpers/mock-sdk.js";
import { TestProvider } from "../helpers/test-wrapper.js";

const { useAgentState } = await import("../../hooks/useAgentState.js");
const { useAgentConversation } = await import("../../hooks/useAgentConversation.js");
const { useAgentMicrophone } = await import("../../hooks/useAgentMicrophone.js");
const { useAgentPlayer } = await import("../../hooks/useAgentPlayer.js");

function FullReader({ on }: {
  on: (data: {
    state: ReturnType<typeof useAgentState>;
    conv: ReturnType<typeof useAgentConversation>;
    mic: ReturnType<typeof useAgentMicrophone>;
    player: ReturnType<typeof useAgentPlayer>;
  }) => void;
}) {
  on({
    state: useAgentState(),
    conv: useAgentConversation(),
    mic: useAgentMicrophone(),
    player: useAgentPlayer(),
  });
  return null;
}

describe("Integration: Text-only mode (microphone=false, tts=false)", () => {
  beforeEach(resetMocks);

  it("does not create microphone or player", () => {
    let data: any;
    render(
      <TestProvider microphone={false} tts={false}>
        <FullReader on={(d) => { data = d; }} />
      </TestProvider>,
    );

    expect(data.mic.enabled).toBe(false);
    expect(data.player.enabled).toBe(false);
    expect(lastMicrophone).toBeUndefined();
    expect(lastPlayer).toBeUndefined();
  });

  it("start() only connects session, no mic", async () => {
    let data: any;
    render(
      <TestProvider microphone={false} tts={false}>
        <FullReader on={(d) => { data = d; }} />
      </TestProvider>,
    );

    await act(async () => {
      await data.state.start();
    });

    expect(lastSession.connect).toHaveBeenCalled();
    expect(lastMicrophone).toBeUndefined();
  });

  it("conversation text events still update state", async () => {
    let data: any;
    render(
      <TestProvider microphone={false} tts={false}>
        <FullReader on={(d) => { data = d; }} />
      </TestProvider>,
    );

    act(() => {
      lastSession.emit("conversation-text", {
        type: "ConversationText",
        role: "assistant",
        content: "Text-only response",
      });
    });

    expect(data.conv.conversation).toHaveLength(1);
    expect(data.conv.conversation[0].content).toBe("Text-only response");
  });

  it("sendUserMessage works without microphone", () => {
    let data: any;
    render(
      <TestProvider microphone={false} tts={false}>
        <FullReader on={(d) => { data = d; }} />
      </TestProvider>,
    );

    act(() => {
      data.conv.sendUserMessage("Hello from text");
    });

    expect(lastSession.injectUserMessage).toHaveBeenCalledWith("Hello from text");
  });

  it("audio events are ignored when tts=false (no player to crash)", () => {
    render(
      <TestProvider microphone={false} tts={false}>
        <div />
      </TestProvider>,
    );

    // Audio event with no player should not throw
    act(() => {
      lastSession.emit("audio", new ArrayBuffer(480));
    });
    // No assertion needed — test passes if no error
  });
});
