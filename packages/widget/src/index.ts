import { render, h } from "preact";
import { SidebarWidget, InlineWidget, FloatingWidget } from "./widget.js";
import type { WidgetConfig, WidgetColorScheme, WidgetTheme } from "./types.js";
import "./styles.css";

export type {
  WidgetConfig,
  WidgetTheme,
  WidgetTextContent,
  WidgetOverrides,
  WidgetCallbacks,
  WidgetLayout,
  WidgetPlacement,
  WidgetColorScheme,
} from "./types.js";

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
 *   });
 * </script>
 * ```
 *
 * @example Class-based dark mode (Tailwind / next-themes):
 * ```js
 * DeepgramAgent.init({
 *   tokenFactory: ...,
 *   agent: ...,
 *   colorScheme: { mode: 'class', darkSelector: '.dark' },
 * });
 * ```
 *
 * @returns A teardown function that unmounts the widget and cleans up injected styles
 */
export function init(config: WidgetConfig): () => void {
  const layout = config.layout ?? "sidebar";
  const cleanups: Array<() => void> = [];

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

    container.setAttribute("data-dg-agent", "");
    applyColorScheme(container, config.colorScheme);
    applyTheme(container, config.theme);

    render(h(InlineWidget, { config }), container);
    return () => {
      render(null, container);
      container.removeAttribute("data-dg-agent");
      container.removeAttribute("data-dg-scheme");
    };
  }

  // Sidebar and floating layouts mount into a root div on <body>
  const root = document.createElement("div");
  root.setAttribute("data-dg-agent", "");
  document.body.appendChild(root);

  applyColorScheme(root, config.colorScheme);
  applyTheme(root, config.theme);

  // Class-based color scheme injects a scoped <style> tag
  if (config.colorScheme && typeof config.colorScheme === "object" && config.colorScheme.mode === "class") {
    const styleCleanup = injectClassSchemeStyle(config.colorScheme);
    cleanups.push(styleCleanup);
  }

  const toggle = () => {
    root.querySelector<HTMLElement>(".dg-va-panel")?.classList.toggle("dg-va-open");
    root.querySelector<HTMLElement>(".dg-va-overlay")?.classList.toggle("dg-va-open");
  };

  if (layout === "floating") {
    render(h(FloatingWidget, { config }), root);
  } else {
    render(h(SidebarWidget, { config }), root);
  }

  if (config.defaultOpen) {
    requestAnimationFrame(toggle);
  }

  if (config.buttonId) {
    document.getElementById(config.buttonId)?.addEventListener("click", toggle);
  }

  document.addEventListener("dg-agent-toggle", toggle);

  return () => {
    document.removeEventListener("dg-agent-toggle", toggle);
    cleanups.forEach((fn) => fn());
    render(null, root);
    root.remove();
  };
}

// ---------------------------------------------------------------------------
// Color scheme
// ---------------------------------------------------------------------------

function applyColorScheme(root: HTMLElement, scheme: WidgetColorScheme | undefined): void {
  if (!scheme || scheme === "auto") return;

  if (scheme === "light" || scheme === "dark") {
    root.setAttribute("data-dg-scheme", scheme);
    return;
  }

  // Class-based: handled separately via injected <style> — nothing on the element itself
}

/**
 * Injects a scoped `<style>` tag that maps ancestor CSS selectors to
 * `color-scheme: dark | light` on `[data-dg-agent]`. This is the safest
 * approach for class-based theming since we don't know the DOM structure.
 */
function injectClassSchemeStyle(scheme: Extract<WidgetColorScheme, { mode: "class" }>): () => void {
  const darkSel  = scheme.darkSelector  ?? ".dark";
  const lightSel = scheme.lightSelector ?? ".light";

  const style = document.createElement("style");
  style.setAttribute("data-dg-scheme-style", "");
  style.textContent = [
    `${darkSel} [data-dg-agent] { color-scheme: dark; }`,
    `${lightSel} [data-dg-agent] { color-scheme: light; }`,
  ].join("\n");
  document.head.appendChild(style);

  return () => style.remove();
}

// ---------------------------------------------------------------------------
// Theme tokens → CSS custom properties on the widget root element
// ---------------------------------------------------------------------------

const TOKEN_MAP: Array<[keyof WidgetTheme, string]> = [
  ["primary",          "--dg-va-primary"],
  ["background",       "--dg-va-bg"],
  ["backgroundRaised", "--dg-va-bg-raised"],
  ["backgroundInput",  "--dg-va-bg-input"],
  ["text",             "--dg-va-text"],
  ["textMuted",        "--dg-va-text-muted"],
  ["border",           "--dg-va-border"],
  ["error",            "--dg-va-error"],
  ["buttonRadius",     "--dg-va-btn-radius"],
  ["panelRadius",      "--dg-va-radius"],
];

function applyTheme(root: HTMLElement, theme: WidgetTheme | undefined): void {
  if (!theme) return;
  for (const [key, prop] of TOKEN_MAP) {
    const val = theme[key];
    if (val != null) {
      root.style.setProperty(prop, typeof val === "number" ? `${val}px` : val);
    }
  }
  if (theme.fabSize != null) {
    root.style.setProperty("--dg-va-fab-size", `${theme.fabSize}px`);
  }
}
