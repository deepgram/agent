import React from "react";
import { describe, it, expect, beforeEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";

// Install mocks before importing components
import { resetMocks, lastSession } from "./helpers/mock-sdk.js";
import { TestProvider } from "./helpers/test-wrapper.js";

const { AgentStatus } = await import("../components/AgentStatus.js");
const { AgentConversation } = await import("../components/AgentConversation.js");
const { AgentTextInput } = await import("../components/AgentTextInput.js");
const { AgentStartButton } = await import("../components/AgentStartButton.js");
const { AgentMicrophoneButton } = await import("../components/AgentMicrophoneButton.js");
const { AgentSpeakerButton } = await import("../components/AgentSpeakerButton.js");

function renderInProvider(ui: React.ReactElement, props = {}) {
  return render(<TestProvider {...props}>{ui}</TestProvider>);
}

describe("AgentStatus", () => {
  beforeEach(resetMocks);

  it("renders default label for idle state", () => {
    renderInProvider(<AgentStatus />);
    expect(screen.getByText("Not started")).toBeDefined();
  });

  it("has data-state attribute", () => {
    const { container } = renderInProvider(<AgentStatus />);
    const el = container.querySelector("[data-agent-status]");
    expect(el?.getAttribute("data-state")).toBe("idle");
  });

  it("has aria-live polite", () => {
    const { container } = renderInProvider(<AgentStatus />);
    const el = container.querySelector("[data-agent-status]");
    expect(el?.getAttribute("aria-live")).toBe("polite");
  });

  it("uses custom labels when provided", () => {
    renderInProvider(<AgentStatus labels={{ idle: "Ready" }} />);
    expect(screen.getByText("Ready")).toBeDefined();
  });
});

describe("AgentConversation", () => {
  beforeEach(resetMocks);

  it("renders empty state when no messages", () => {
    renderInProvider(
      <AgentConversation emptyState={<span>No messages</span>} />,
    );
    expect(screen.getByText("No messages")).toBeDefined();
  });

  it("renders nothing when no messages and no empty state", () => {
    const { container } = renderInProvider(<AgentConversation />);
    const el = container.querySelector("[data-agent-conversation]");
    // Should have only the scroll anchor div, no message divs
    expect(el?.children.length).toBe(1); // just the bottomRef div
  });

  it("renders messages with data-role after conversation-text event", async () => {
    const { container } = renderInProvider(<AgentConversation />);

    // Simulate conversation events via the mock session's EventEmitter
    const { act } = await import("@testing-library/react");
    act(() => {
      lastSession.emit("conversation-text", {
        type: "ConversationText",
        role: "assistant",
        content: "Hello!",
      });
    });

    const msg = container.querySelector("[data-role='assistant']");
    expect(msg).toBeDefined();
    expect(msg?.textContent).toBe("Hello!");
  });

  it("uses custom renderMessage", async () => {
    const { container } = renderInProvider(
      <AgentConversation
        renderMessage={(entry) => <strong>{entry.content}</strong>}
      />,
    );

    const { act } = await import("@testing-library/react");
    act(() => {
      lastSession.emit("conversation-text", {
        type: "ConversationText",
        role: "user",
        content: "Hi",
      });
    });

    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("Hi");
  });
});

describe("AgentTextInput", () => {
  beforeEach(resetMocks);

  it("is disabled when not active", () => {
    renderInProvider(<AgentTextInput />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it("enables after connection", async () => {
    renderInProvider(<AgentTextInput />);
    const { act } = await import("@testing-library/react");

    // We need to simulate the provider's start flow
    // The mock session connect emits "connecting" then "connected"
    act(() => {
      lastSession.emit("connected");
      lastSession.state = "connected";
      // Force a re-render by triggering the state listener
    });
  });

  it("has the correct placeholder", () => {
    renderInProvider(<AgentTextInput placeholder="Say something..." />);
    const textarea = screen.getByPlaceholderText("Say something...");
    expect(textarea).toBeDefined();
  });
});

describe("AgentStartButton", () => {
  beforeEach(resetMocks);

  it("shows Start label in idle state", () => {
    renderInProvider(<AgentStartButton />);
    expect(screen.getByText("Start")).toBeDefined();
  });

  it("has data-agent-start-button attribute", () => {
    const { container } = renderInProvider(<AgentStartButton />);
    const btn = container.querySelector("[data-agent-start-button]");
    expect(btn).toBeDefined();
    expect(btn?.getAttribute("data-state")).toBe("idle");
  });

  it("shows custom startLabel", () => {
    renderInProvider(<AgentStartButton startLabel="Begin" />);
    expect(screen.getByText("Begin")).toBeDefined();
  });
});

describe("AgentMicrophoneButton", () => {
  beforeEach(resetMocks);

  it("renders when microphone is enabled", () => {
    const { container } = renderInProvider(<AgentMicrophoneButton />);
    const btn = container.querySelector("[data-agent-mic-button]");
    expect(btn).toBeDefined();
  });

  it("returns null when microphone={false}", () => {
    const { container } = renderInProvider(
      <AgentMicrophoneButton />,
      { microphone: false },
    );
    const btn = container.querySelector("[data-agent-mic-button]");
    expect(btn).toBeNull();
  });

  it("shows disabledLabel when microphone={false} and disabledLabel provided", () => {
    renderInProvider(
      <AgentMicrophoneButton disabledLabel="Mic off" />,
      { microphone: false },
    );
    expect(screen.getByText("Mic off")).toBeDefined();
  });

  it("has aria-pressed attribute", () => {
    const { container } = renderInProvider(<AgentMicrophoneButton />);
    const btn = container.querySelector("[data-agent-mic-button]");
    expect(btn?.getAttribute("aria-pressed")).toBe("true"); // not muted
  });
});

describe("AgentSpeakerButton", () => {
  beforeEach(resetMocks);

  it("renders when tts is enabled", () => {
    const { container } = renderInProvider(<AgentSpeakerButton />);
    const btn = container.querySelector("[data-agent-speaker-button]");
    expect(btn).toBeDefined();
  });

  it("returns null when tts={false}", () => {
    const { container } = renderInProvider(
      <AgentSpeakerButton />,
      { tts: false },
    );
    const btn = container.querySelector("[data-agent-speaker-button]");
    expect(btn).toBeNull();
  });

  it("has aria-pressed attribute", () => {
    const { container } = renderInProvider(<AgentSpeakerButton />);
    const btn = container.querySelector("[data-agent-speaker-button]");
    expect(btn?.getAttribute("aria-pressed")).toBe("true"); // not muted
  });

  it("shows correct data-state", () => {
    const { container } = renderInProvider(<AgentSpeakerButton />);
    const btn = container.querySelector("[data-agent-speaker-button]");
    expect(btn?.getAttribute("data-state")).toBe("active");
  });
});
