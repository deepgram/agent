import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjected from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
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
