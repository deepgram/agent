import { render, h } from "preact";
import { SidebarWidget, InlineWidget, FloatingWidget, ButtonWidget, EmbeddedWidget, OrbWidget } from "./widget.js";
import type { WidgetConfig, WidgetColorScheme, WidgetTheme } from "./types.js";
import "@deepgram/agent-react-ui/styles.css";
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

  if (layout === "button") {
    // Button can mount into a containerId or append a wrapper to body
    let root: HTMLElement;
    let createdRoot = false;
    if (config.containerId) {
      const el = document.getElementById(config.containerId);
      if (!el) throw new Error(`[@deepgram/agent-widget] Container #${config.containerId} not found`);
      root = el;
    } else {
      root = document.createElement("div");
      document.body.appendChild(root);
      createdRoot = true;
    }
    root.setAttribute("data-dg-agent", "");
    applyColorScheme(root, config.colorScheme);
    applyTheme(root, config.theme);

    render(h(ButtonWidget, { config }), root);
    return () => {
      render(null, root);
      if (createdRoot) root.remove();
      else {
        root.removeAttribute("data-dg-agent");
        root.removeAttribute("data-dg-scheme");
      }
    };
  }

  if (layout === "orb") {
    let root: HTMLElement;
    let createdRoot = false;
    if (config.containerId) {
      const el = document.getElementById(config.containerId);
      if (!el) throw new Error(`[@deepgram/agent-widget] Container #${config.containerId} not found`);
      root = el;
    } else {
      root = document.createElement("div");
      document.body.appendChild(root);
      createdRoot = true;
    }
    root.setAttribute("data-dg-agent", "");
    root.style.background = "transparent";
    applyColorScheme(root, config.colorScheme);
    applyTheme(root, config.theme);

    render(h(OrbWidget, { config }), root);
    return () => {
      render(null, root);
      if (createdRoot) root.remove();
      else {
        root.removeAttribute("data-dg-agent");
        root.removeAttribute("data-dg-scheme");
      }
    };
  }

  if (layout === "embedded") {
    const containerId = config.containerId;
    if (!containerId) {
      throw new Error(
        '[@deepgram/agent-widget] layout "embedded" requires containerId',
      );
    }
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(
        `[@deepgram/agent-widget] Container #${containerId} not found`,
      );
    }

    container.setAttribute("data-dg-agent", "");
    container.classList.add("dg-va-embedded");
    applyColorScheme(container, config.colorScheme);
    applyTheme(container, config.theme);

    render(h(EmbeddedWidget, { config }), container);
    return () => {
      render(null, container);
      container.classList.remove("dg-va-embedded");
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
    render(h(FloatingWidget, { config, onToggle: toggle }), root);
  } else {
    render(h(SidebarWidget, { config, onToggle: toggle }), root);
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
  // Accent
  ["primary",              "--dg-va-primary"],
  ["primaryHover",         "--dg-va-primary-hover"],
  ["primaryActive",        "--dg-va-primary-active"],
  ["onPrimary",            "--dg-va-on-primary"],
  // Surface
  ["background",           "--dg-va-bg"],
  ["backgroundRaised",     "--dg-va-bg-raised"],
  ["backgroundInput",      "--dg-va-bg-input"],
  ["backgroundHover",      "--dg-va-bg-hover"],
  ["backgroundActive",     "--dg-va-bg-active"],
  // Text
  ["text",                 "--dg-va-text"],
  ["textMuted",            "--dg-va-text-muted"],
  // Chrome
  ["border",               "--dg-va-border"],
  ["error",                "--dg-va-error"],
  ["overlay",              "--dg-va-overlay"],
  // Messages
  ["userMessageBackground","--dg-va-msg-user-bg"],
  ["userMessageBorder",    "--dg-va-msg-user-border"],
  // Radius
  ["panelRadius",          "--dg-va-radius"],
  ["buttonRadius",         "--dg-va-btn-radius"],
  ["inputRadius",          "--dg-va-input-radius"],
  ["messageRadius",        "--dg-va-msg-radius"],
  // Structural
  ["padding",              "--dg-va-padding"],
  ["font",                 "--dg-va-font"],
  ["aspect",               "--dg-va-aspect"],
  ["minHeight",            "--dg-va-min-h"],
  ["maxHeight",            "--dg-va-max-h"],
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
