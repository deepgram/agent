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
      // Inherited from outer process (set by op run or direct env)
      DEEPGRAM_API_KEY:       process.env.DEEPGRAM_API_KEY ?? "",
      VITE_DEEPGRAM_API_KEY:  process.env.VITE_DEEPGRAM_API_KEY ?? process.env.DEEPGRAM_API_KEY ?? "",
    },
  },
});
