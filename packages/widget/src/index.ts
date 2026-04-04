import { render, h } from "preact";
import { SidebarWidget, InlineWidget, FloatingWidget } from "./widget.js";
import type { WidgetConfig } from "./types.js";
import "./styles.css";

export type { WidgetConfig } from "./types.js";

/**
 * Initialise the Deepgram Voice Agent widget.
 *
 * @example CDN (sidebar, default):
 * ```html
 * <script src="https://cdn.deepgram.com/voice-agent-widget/latest/widget.umd.js"></script>
 * <script>
 *   DeepgramAgent.init({
 *     tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
 *     agent: { think: { type: 'open_ai', model: 'gpt-4o-mini' } },
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
 */
export function init(config: WidgetConfig): () => void {
  applyTheme(config.theme);

  const layout = config.layout ?? "sidebar";

  if (layout === "inline") {
    const containerId = config.containerId;
    if (!containerId) {
      throw new Error(
        '[@deepgram/voice-agent-widget] layout "inline" requires containerId',
      );
    }
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(
        `[@deepgram/voice-agent-widget] Container #${containerId} not found`,
      );
    }
    render(h(InlineWidget, { config }), container);
    return () => render(null, container);
  }

  // Sidebar and floating layouts mount into a fresh div on <body>
  const root = document.createElement("div");
  root.setAttribute("data-dg-agent", "");
  document.body.appendChild(root);

  if (layout === "floating") {
    render(h(FloatingWidget, { config }), root);
  } else {
    // sidebar
    render(h(SidebarWidget, { config }), root);

    // Wire up an optional external toggle button
    if (config.buttonId) {
      const btn = document.getElementById(config.buttonId);
      btn?.addEventListener("click", () => {
        root.querySelector<HTMLElement>(".dg-va-panel")?.classList.toggle("dg-va-open");
        root.querySelector<HTMLElement>(".dg-va-overlay")?.classList.toggle("dg-va-open");
      });
    }

    // Support custom event from page code
    document.addEventListener("dg-agent-toggle", () => {
      root.querySelector<HTMLElement>(".dg-va-panel")?.classList.toggle("dg-va-open");
      root.querySelector<HTMLElement>(".dg-va-overlay")?.classList.toggle("dg-va-open");
    });
  }

  return () => {
    render(null, root);
    root.remove();
  };
}

function applyTheme(theme: WidgetConfig["theme"]): void {
  if (!theme) return;
  const style = document.documentElement.style;
  if (theme.primary) style.setProperty("--dg-va-primary", theme.primary);
  if (theme.background) style.setProperty("--dg-va-bg", theme.background);
  if (theme.text) style.setProperty("--dg-va-text", theme.text);
  if (theme.radius) style.setProperty("--dg-va-radius", theme.radius);
}
