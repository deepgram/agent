/**
 * Minimal React example using useDeepgramAgent directly.
 * Demonstrates building a custom UI on top of the hook — no pre-built widget.
 */
import { useState } from "react";
import { useDeepgramAgent } from "@deepgram/agent-react";
import { baseConfig } from "./agent-config.js";

interface Props {
  layout: "sidebar" | "inline" | "floating";
}

export function ReactExample({ layout }: Props) {
  const [open, setOpen] = useState(layout !== "floating");

  const {
    state,
    micActive,
    conversation,
    start,
    stop,
    setMicMuted,
    sendUserMessage,
    interrupt,
  } = useDeepgramAgent({
    config: baseConfig,
    onFunctionCall: async () => JSON.stringify({ ok: true }),
  });

  const [text, setText] = useState("");
  const [micMuted, setMicMutedLocal] = useState(false);
  const isActive = state === "connected" || state === "connecting" || state === "reconnecting";

  function handleMicToggle() {
    const next = !micMuted;
    setMicMutedLocal(next);
    setMicMuted(next);
  }

  function handleSend() {
    if (!text.trim() || !isActive) return;
    sendUserMessage(text);
    setText("");
  }

  const panel = (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Voice Agent <span style={{ color: "#13EF93", fontSize: 12 }}>useDeepgramAgent</span></span>
        <span style={{ ...styles.dot, background: state === "connected" ? "#13EF93" : state === "reconnecting" ? "#f59e0b" : "#6b7280" }} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>{state}</span>
        {layout !== "inline" && <button onClick={() => setOpen(false)} style={styles.iconBtn}>✕</button>}
      </div>

      <div style={styles.messages}>
        {conversation.length === 0
          ? <div style={styles.empty}>Press Start to begin</div>
          : conversation.map((m) => (
            <div key={m.id} style={{ ...styles.msg, ...(m.role === "user" ? styles.msgUser : styles.msgAgent) }}>
              {m.content}
            </div>
          ))}
      </div>

      <div style={styles.controls}>
        {isActive && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={text}
              onChange={(e) => setText((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message…"
              style={styles.input}
            />
            <button onClick={handleMicToggle} style={{ ...styles.iconBtn, background: micMuted ? "#1e1e24" : micActive ? "#13EF93" : "#1e1e24", color: micMuted ? "#6b7280" : micActive ? "#000" : "#fff" }}>🎤</button>
            <button onClick={interrupt} style={styles.iconBtn} title="Interrupt">⏹</button>
          </div>
        )}
        <button
          onClick={isActive ? stop : start}
          style={{ ...styles.startBtn, ...(isActive ? styles.stopBtn : {}) }}
        >
          {isActive ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );

  if (layout === "inline") return panel;

  return (
    <>
      {layout === "floating" && (
        <button onClick={() => setOpen((o) => !o)} style={styles.fab}>🎙</button>
      )}
      {open && (
        <div style={layout === "sidebar" ? styles.sidebar : styles.overlay}>
          {panel}
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel:    { display: "flex", flexDirection: "column", height: "100%", background: "#101014", color: "#fff", fontFamily: "system-ui, sans-serif" },
  header:   { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  title:    { flex: 1, fontWeight: 600, fontSize: 14 },
  dot:      { width: 7, height: 7, borderRadius: "50%" },
  messages: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  empty:    { margin: "auto", color: "#6b7280", fontSize: 14 },
  msg:      { maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 14, lineHeight: 1.5 },
  msgUser:  { alignSelf: "flex-end", background: "rgba(19,239,147,0.15)", border: "1px solid rgba(19,239,147,0.2)" },
  msgAgent: { alignSelf: "flex-start", background: "#18181c", border: "1px solid rgba(255,255,255,0.08)" },
  controls: { padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 8 },
  input:    { flex: 1, background: "#1e1e24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 14, outline: "none" },
  iconBtn:  { width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1e1e24", color: "#fff", cursor: "pointer", fontSize: 16 },
  startBtn: { padding: "10px", borderRadius: 8, background: "#13EF93", color: "#000", fontWeight: 600, border: "none", cursor: "pointer" },
  stopBtn:  { background: "#18181c", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
  fab:      { position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#13EF93", border: "none", fontSize: 24, cursor: "pointer", zIndex: 99998 },
  sidebar:  { position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", zIndex: 99999, boxShadow: "-4px 0 32px rgba(0,0,0,0.5)" },
  overlay:  { position: "fixed", bottom: 90, right: 24, width: "min(380px,90vw)", height: 500, borderRadius: 16, overflow: "hidden", zIndex: 99999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" },
};
