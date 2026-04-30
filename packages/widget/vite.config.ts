import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjected from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";
import { createRequire } from "module";

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
