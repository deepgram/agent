import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "@deepgram/sdk",
        "eventemitter3",
        "@ricky0123/vad-web",
        "onnxruntime-web",
      ],
    },
    minify: "terser",
    sourcemap: true,
  },
  plugins: [
    dts({ rollupTypes: true }),
  ],
});
