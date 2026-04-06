import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjected from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";
import { createRequire } from "module";

// Rolldown (Vite 8) requires aliases to be absolute paths; string module IDs
// are no longer resolved automatically. More-specific paths ("react/jsx-runtime")
// must be declared before the broader "react" alias to prevent the broad alias
// from capturing the sub-path first.
const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      "react/jsx-runtime": require.resolve("preact/compat/jsx-runtime"),
      "react-dom": require.resolve("preact/compat"),
      react: require.resolve("preact/compat"),
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
