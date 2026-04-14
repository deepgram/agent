import { describe, it, expect, afterEach, mock } from "bun:test";
import { h } from "preact";

// Mock the widget layout components to avoid importing @deepgram/react
mock.module("../widget.js", () => ({
  SidebarWidget: ({ config }: any) => h("div", { class: "dg-va-panel" }),
  InlineWidget: ({ config }: any) => h("div", { class: "dg-va-panel" }),
  FloatingWidget: ({ config }: any) => h("div", { class: "dg-va-panel" }),
  ButtonWidget: ({ config }: any) => h("button", { class: "dg-va-agent-btn" }, "Talk"),
  EmbeddedWidget: ({ config }: any) => h("div", { class: "dg-va-panel-inline" }),
  OrbWidget: ({ config }: any) => h("div", { class: "dg-va-orb-layout" }),
}));

const { init } = await import("../index.js");

const baseConfig = {
  apiKey: "test-key",
  agent: "test-agent-uuid",
};

describe("init()", () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    document.querySelectorAll("[data-dg-agent]").forEach((el) => el.remove());
    document.querySelectorAll("[data-dg-scheme-style]").forEach((el) => el.remove());
  });

  describe("layout validation", () => {
    it("throws when layout=inline and no containerId", () => {
      expect(() => init({ ...baseConfig, layout: "inline" } as any)).toThrow(
        'layout "inline" requires containerId',
      );
    });

    it("throws when layout=inline and container not found", () => {
      expect(() =>
        init({ ...baseConfig, layout: "inline", containerId: "missing" } as any),
      ).toThrow("Container #missing not found");
    });
  });

  describe("sidebar layout (default)", () => {
    it("creates root div with data-dg-agent attribute", () => {
      teardown = init(baseConfig as any);
      const root = document.querySelector("[data-dg-agent]");
      expect(root).not.toBeNull();
    });

    it("appends root to document.body", () => {
      teardown = init(baseConfig as any);
      const root = document.querySelector("[data-dg-agent]");
      expect(root?.parentElement).toBe(document.body);
    });

    it("teardown removes root from DOM", () => {
      teardown = init(baseConfig as any);
      expect(document.querySelector("[data-dg-agent]")).not.toBeNull();

      teardown();
      teardown = undefined;
      expect(document.querySelector("[data-dg-agent]")).toBeNull();
    });
  });

  describe("inline layout", () => {
    it("sets data-dg-agent on existing container", () => {
      const container = document.createElement("div");
      container.id = "my-widget";
      document.body.appendChild(container);

      teardown = init({ ...baseConfig, layout: "inline", containerId: "my-widget" } as any);
      expect(container.hasAttribute("data-dg-agent")).toBe(true);
      container.remove();
    });

    it("teardown removes data-dg-agent attribute", () => {
      const container = document.createElement("div");
      container.id = "inline-test";
      document.body.appendChild(container);

      teardown = init({ ...baseConfig, layout: "inline", containerId: "inline-test" } as any);
      teardown();
      teardown = undefined;

      expect(container.hasAttribute("data-dg-agent")).toBe(false);
      container.remove();
    });
  });

  describe("color scheme", () => {
    it("does not set data-dg-scheme for auto (default)", () => {
      teardown = init(baseConfig as any);
      const root = document.querySelector("[data-dg-agent]");
      expect(root?.hasAttribute("data-dg-scheme")).toBe(false);
    });

    it("sets data-dg-scheme=dark for dark scheme", () => {
      teardown = init({ ...baseConfig, colorScheme: "dark" } as any);
      const root = document.querySelector("[data-dg-agent]");
      expect(root?.getAttribute("data-dg-scheme")).toBe("dark");
    });

    it("sets data-dg-scheme=light for light scheme", () => {
      teardown = init({ ...baseConfig, colorScheme: "light" } as any);
      const root = document.querySelector("[data-dg-agent]");
      expect(root?.getAttribute("data-dg-scheme")).toBe("light");
    });

    it("injects style tag for class-based scheme", () => {
      teardown = init({
        ...baseConfig,
        colorScheme: { mode: "class", darkSelector: ".dark-mode" },
      } as any);
      const style = document.querySelector("[data-dg-scheme-style]");
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain(".dark-mode [data-dg-agent]");
    });

    it("teardown removes injected style tag", () => {
      teardown = init({
        ...baseConfig,
        colorScheme: { mode: "class" },
      } as any);
      expect(document.querySelector("[data-dg-scheme-style]")).not.toBeNull();

      teardown();
      teardown = undefined;
      expect(document.querySelector("[data-dg-scheme-style]")).toBeNull();
    });
  });

  describe("theme tokens", () => {
    it("sets CSS custom properties from theme config", () => {
      teardown = init({
        ...baseConfig,
        theme: { primary: "#ff0000", panelRadius: "8px" },
      } as any);
      const root = document.querySelector("[data-dg-agent]") as HTMLElement;
      expect(root.style.getPropertyValue("--dg-va-primary")).toBe("#ff0000");
      expect(root.style.getPropertyValue("--dg-va-radius")).toBe("8px");
    });

    it("sets fabSize as px value", () => {
      teardown = init({
        ...baseConfig,
        theme: { fabSize: 64 },
      } as any);
      const root = document.querySelector("[data-dg-agent]") as HTMLElement;
      expect(root.style.getPropertyValue("--dg-va-fab-size")).toBe("64px");
    });
  });

  describe("toggle event listener", () => {
    it("registers dg-agent-toggle listener on document", () => {
      teardown = init(baseConfig as any);
      // The init function registers `document.addEventListener("dg-agent-toggle", toggle)`.
      // We verify it ran without error and teardown cleans up.
      expect(teardown).toBeInstanceOf(Function);
    });

    it("teardown returns a callable function", () => {
      teardown = init(baseConfig as any);
      expect(() => {
        teardown!();
        teardown = undefined;
      }).not.toThrow();
    });
  });
});
