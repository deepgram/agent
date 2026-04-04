import { render, h } from "preact";
import { SidebarWidget, InlineWidget, FloatingWidget } from "./widget.js";
import type { WidgetConfig } from "./types.js";
import "./styles.css";

export type { WidgetConfig, WidgetTheme, WidgetTextContent, WidgetOverrides, WidgetCallbacks, WidgetLayout, WidgetPlacement } from "./types.js";

/**
 * Initialise the Deepgram Voice Agent widget.
 *
 * @example CDN sidebar (default):
 * ```html
 * <script src="https://cdn.deepgram.com/agent-widget/latest/widget.umd.js"></script>
 * <script>
 *   DeepgramAgent.init({
 *     tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
 *     agent: { think: { type: 'open_ai', model: 'gpt-4o-mini' } },
 *     on: { onConnect: () => console.log('connected') },
 *   });
 * </script>
 * ```
 *
 * @example Inline embed:
 * ```html
 * <div id="agent-container" style="height:600px"></div>
 * <script>
 *   DeepgramAgent.init({
 *     tokenFactory: () => fetch('/api/token').then(r => r.text()),
 *     agent: 'your-agent-uuid',
 *     layout: 'inline',
 *     containerId: 'agent-container',
 *   });
 * </script>
 * ```
 *
 * @returns A teardown function that unmounts the widget
 */
export function init(config: WidgetConfig): () => void {
  applyTheme(config.theme);

  const layout = config.layout ?? "sidebar";

  if (layout === "inline") {
    const containerId = config.containerId;
    if (!containerId) {
      throw new Error(
        '[@deepgram/agent-widget] layout "inline" requires containerId',
      );
    }
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(
        `[@deepgram/agent-widget] Container #${containerId} not found`,
      );
    }
    render(h(InlineWidget, { config }), container);
    return () => render(null, container);
  }

  // Sidebar and floating layouts mount into a fresh root div on <body>
  const root = document.createElement("div");
  root.setAttribute("data-dg-agent", "");
  document.body.appendChild(root);

  const toggle = () => {
    root.querySelector<HTMLElement>(".dg-va-panel")?.classList.toggle("dg-va-open");
    root.querySelector<HTMLElement>(".dg-va-overlay")?.classList.toggle("dg-va-open");
  };

  if (layout === "floating") {
    render(h(FloatingWidget, { config }), root);
  } else {
    render(h(SidebarWidget, { config }), root);
  }

  // Open by default if configured
  if (config.defaultOpen) {
    requestAnimationFrame(toggle);
  }

  // Wire up an optional external toggle button
  if (config.buttonId) {
    document.getElementById(config.buttonId)?.addEventListener("click", toggle);
  }

  // Support toggle via custom DOM event: document.dispatchEvent(new Event('dg-agent-toggle'))
  document.addEventListener("dg-agent-toggle", toggle);

  return () => {
    document.removeEventListener("dg-agent-toggle", toggle);
    render(null, root);
    root.remove();
  };
}

function applyTheme(theme: WidgetConfig["theme"]): void {
  if (!theme) return;
  const s = document.documentElement.style;
  if (theme.primary)         s.setProperty("--dg-va-primary", theme.primary);
  if (theme.background)      s.setProperty("--dg-va-bg", theme.background);
  if (theme.backgroundRaised) s.setProperty("--dg-va-bg-raised", theme.backgroundRaised);
  if (theme.text)            s.setProperty("--dg-va-text", theme.text);
  if (theme.textMuted)       s.setProperty("--dg-va-text-muted", theme.textMuted);
  if (theme.buttonRadius)    s.setProperty("--dg-va-btn-radius", theme.buttonRadius);
  if (theme.panelRadius)     s.setProperty("--dg-va-radius", theme.panelRadius);
  if (theme.fabSize)         s.setProperty("--dg-va-fab-size", `${theme.fabSize}px`);
}
