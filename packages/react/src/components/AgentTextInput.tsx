import { useState } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation.js";
import { useAgentState } from "../hooks/useAgentState.js";

export interface AgentTextInputProps {
  className?: string;
  placeholder?: string;
  /** Disable the input regardless of connection state. */
  disabled?: boolean;
  /** Called when the user submits a message (after sendUserMessage is called). */
  onSend?: (text: string) => void;
  /** Custom submit button. Defaults to a <button> labelled "Send". */
  submitButton?: unknown;
}

/**
 * Text input that sends messages to the agent via injectUserMessage.
 * Submits on Enter (without Shift) or button click.
 * Automatically disabled when the session is not active.
 */
export function AgentTextInput({
  className,
  placeholder = "Type a message…",
  disabled = false,
  onSend,
  submitButton,
}: AgentTextInputProps) {
  const [value, setValue] = useState("");
  const { sendUserMessage } = useAgentConversation();
  const { isActive } = useAgentState();

  function handleSend() {
    const text = value.trim();
    if (!text || !isActive || disabled) return;
    sendUserMessage(text);
    onSend?.(text);
    setValue("");
  }

  return (
    <div className={className} data-agent-text-input>
      <textarea
        value={value}
        onChange={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
        }}
        placeholder={placeholder}
        disabled={disabled || !isActive}
        aria-label="Message input"
        rows={1}
      />
      {submitButton !== undefined ? (
        <span onClick={handleSend}>{submitButton as React.ReactNode}</span>
      ) : (
        <button onClick={handleSend} disabled={disabled || !isActive || !value.trim()} aria-label="Send">
          Send
        </button>
      )}
    </div>
  );
}
