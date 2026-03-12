import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    dts({ rollupTypes: true }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'DeepgramConsoleAgent',
      formats: ['es', 'umd'],
      fileName: (format) => `deepgram-console-agent.${format}.js`,
    },
    rollupOptions: {
      // Bundle everything — no externals for standalone widget
    },
  },
});
