import { useState } from "react";
import { useAgentConversation, useAgentState } from "@deepgram/agent-react";

export interface AgentTextInputProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend?: (text: string) => void;
  submitButton?: unknown;
}

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
