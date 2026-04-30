import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import cssInjected from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";
import { createRequire } from "module";

// Rolldown (Vite 8) requires aliases to be absolute paths; string module IDs
// are no longer resolved automatically. More-specific paths ("react/jsx-runtime")
// must be declared before the broader "react" alias to prevent the broad alias
// from capturing the sub-path first.
const require = createRequire(import.meta.url);

// Point @deepgram/ui at its pre-compiled dist — Tailwind is already compiled
// in there by @deepgram/ui's own vite build. The widget just bundles it.
const UI_DIST = resolve(__dirname, "../../../ui/packages/ui/dist");

export default defineConfig({
  resolve: {
    alias: {
      "react/jsx-runtime": require.resolve("preact/compat/jsx-runtime"),
      "react-dom":         require.resolve("preact/compat"),
      react:               require.resolve("preact/compat"),
      // Agent + react from source (no Tailwind involved — pure TS/JS)
      "@deepgram/agents":         resolve(__dirname, "../sdk/dist/index.js"),
      "@deepgram/react":         resolve(__dirname, "../../../react/packages/react/dist/index.js"),
      // UI from pre-compiled dist — Tailwind already compiled, CSS already bundled
      "@deepgram/ui/styles.css": resolve(UI_DIST, "styles.css"),
      "@deepgram/ui":            resolve(UI_DIST, "index.js"),
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "DeepgramAgent",
      formats: ["es", "umd"],
      fileName: (format) => `widget.${format}.js`,
    },
    rollupOptions: {
      // Everything is bundled — widget must be self-contained for CDN use
      external: [],
    },
    minify: "terser",
    terserOptions: {
      compress: { passes: 2 },
    },
    sourcemap: true,
  },
  plugins: [
    react({ jsxImportSource: "preact" }),
    cssInjected(),
    dts({ rollupTypes: true }),
  ],
});
