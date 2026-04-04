import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const WAV = path.resolve(fileURLToPath(import.meta.url), "../public/spacewalk.wav");

export default defineConfig({
  testDir: "./test",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    // Use installed Google Chrome — headless-shell doesn't support
    // --use-fake-device-for-media-stream
    channel: "chrome",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${WAV}`,
      ],
    },
    permissions: ["microphone"],
  },
  webServer: {
    command: "bunx vite",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      // DEEPGRAM_API_KEY is used server-side by the /api/token proxy only.
      // It is never injected into the browser bundle.
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ?? "",
    },
  },
});
