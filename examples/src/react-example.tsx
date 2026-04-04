/**
 * React examples — four composition variants showing how omitting components
 * changes the feature set without touching the provider config.
 *
 * Styling is minimal inline CSS to keep focus on structure.
 */
import { useState } from "react";
import {
  AgentProvider,
  AgentStatus,
  AgentConversation,
  AgentTextInput,
  AgentMicrophoneButton,
  AgentSpeakerButton,
  AgentStartButton,
  type ConversationEntry,
} from "@deepgram/agent-react";
import { baseConfig } from "./agent-config.js";

// ---------------------------------------------------------------------------
// Minimal shared styles
// ---------------------------------------------------------------------------
const css = {
  panel:    "dg-ex-panel",
  header:   "dg-ex-header",
  msgs:     "dg-ex-msgs",
  msg:      "dg-ex-msg",
  controls: "dg-ex-controls",
  row:      "dg-ex-row",
};

function Msg({ entry }: { entry: ConversationEntry }) {
  return (
    <div className={`${css.msg} ${css.msg}--${entry.role}`} data-role={entry.role}>
      <strong>{entry.role === "user" ? "You" : "Agent"}:</strong> {entry.content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A — Full: voice + chat (all components)
// ---------------------------------------------------------------------------
export function FullVariant() {
  return (
    <AgentProvider config={baseConfig}>
      <div className={css.panel}>
        <div className={css.header}>
          <span>Full — voice + chat</span>
          <AgentStatus />
        </div>
        <AgentConversation
          className={css.msgs}
          emptyState={<p>Press Start to begin</p>}
          renderMessage={(e) => <Msg key={e.id} entry={e} />}
        />
        <div className={css.controls}>
          <div className={css.row}>
            <AgentTextInput className="dg-ex-input" />
            <AgentMicrophoneButton activeLabel="🎤" mutedLabel="🔇" />
            <AgentSpeakerButton   activeLabel="🔊" mutedLabel="🔕" />
          </div>
          <AgentStartButton />
        </div>
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// B — Text-only: microphone={false} disables mic at provider level
// ---------------------------------------------------------------------------
export function TextOnlyVariant() {
  return (
    <AgentProvider config={baseConfig} microphone={false}>
      <div className={css.panel}>
        <div className={css.header}>
          <span>Text-only <code>microphone=false</code></span>
          <AgentStatus />
        </div>
        <AgentConversation
          className={css.msgs}
          emptyState={<p>Press Start to begin</p>}
          renderMessage={(e) => <Msg key={e.id} entry={e} />}
        />
        <div className={css.controls}>
          <AgentTextInput className="dg-ex-input" />
          <AgentStartButton />
        </div>
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// C — Voice-only: no AgentMicrophoneButton → mic auto-opens on connect
//                  no AgentConversation    → no transcript rendered
//                  no AgentTextInput       → no text input
// ---------------------------------------------------------------------------
export function VoiceOnlyVariant() {
  return (
    <AgentProvider config={baseConfig}>
      <div className={css.panel}>
        <div className={css.header}>
          <span>Voice-only <small>mic auto-opens</small></span>
          <AgentStatus />
        </div>
        {/* Intentionally no Conversation, TextInput, or MicrophoneButton */}
        <div style={{ flex: 1 }} />
        <div className={css.controls}>
          <AgentSpeakerButton activeLabel="🔊 Speaker on" mutedLabel="🔕 Speaker off" />
          <AgentStartButton />
        </div>
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// D — No TTS: tts={false} suppresses audio playback, agent responds in text
// ---------------------------------------------------------------------------
export function NoTTSVariant() {
  return (
    <AgentProvider config={baseConfig} tts={false}>
      <div className={css.panel}>
        <div className={css.header}>
          <span>No TTS <code>tts=false</code></span>
          <AgentStatus />
        </div>
        <AgentConversation
          className={css.msgs}
          emptyState={<p>Text responses only — no audio playback</p>}
          renderMessage={(e) => <Msg key={e.id} entry={e} />}
        />
        <div className={css.controls}>
          <div className={css.row}>
            <AgentTextInput className="dg-ex-input" />
            <AgentMicrophoneButton activeLabel="🎤" mutedLabel="🔇" />
            {/* No AgentSpeakerButton — tts=false so there's nothing to mute */}
          </div>
          <AgentStartButton />
        </div>
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Layout wrappers used by the three HTML pages
// ---------------------------------------------------------------------------

type Variant = "full" | "text" | "voice" | "notts";
const variants: Record<Variant, React.ComponentType> = {
  full:  FullVariant,
  text:  TextOnlyVariant,
  voice: VoiceOnlyVariant,
  notts: NoTTSVariant,
};

function VariantPicker({ current, onChange }: { current: Variant; onChange: (v: Variant) => void }) {
  return (
    <div className="dg-ex-picker">
      {(Object.keys(variants) as Variant[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`dg-ex-pick-btn ${current === v ? "dg-ex-pick-btn--active" : ""}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function ReactSidebarExample() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>("full");
  const V = variants[variant];
  return (
    <>
      <div className="dg-ex-page-controls">
        <button className="dg-ex-open-btn" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Open Agent"}
        </button>
        <VariantPicker current={variant} onChange={setVariant} />
      </div>
      {open && (
        <div className="dg-ex-sidebar">
          <V />
        </div>
      )}
    </>
  );
}

export function ReactInlineExample() {
  const [variant, setVariant] = useState<Variant>("full");
  const V = variants[variant];
  return (
    <div className="dg-ex-inline-layout">
      <div className="dg-ex-inline-left">
        <VariantPicker current={variant} onChange={setVariant} />
        <p className="dg-ex-hint">Switch variants to see how omitting components changes features without touching provider config.</p>
      </div>
      <div className="dg-ex-inline-right">
        <V />
      </div>
    </div>
  );
}

export function ReactFloatingExample() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>("full");
  const V = variants[variant];
  return (
    <>
      <div className="dg-ex-page-controls">
        <VariantPicker current={variant} onChange={setVariant} />
      </div>
      <button className="dg-ex-fab" onClick={() => setOpen((o) => !o)}>🎙</button>
      {open && (
        <div className="dg-ex-floating">
          <V />
        </div>
      )}
    </>
  );
}
