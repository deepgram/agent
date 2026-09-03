import { describe, expect, it } from "bun:test";

describe("@deepgram/sdk runtime contract", () => {
  it("delivers agent binary messages to the public callback as Blob", async () => {
    const source = String.raw`
      import { DeepgramClient } from "@deepgram/sdk";

      let emitMessage;
      const transport = {
        send() {},
        onOpen() {},
        onMessage(listener) { emitMessage = listener; },
        onError() {},
        onClose() {},
        isOpen() { return true; },
        close() {},
      };
      const client = new DeepgramClient({
        apiKey: "test-key",
        reconnect: false,
        transportFactory: () => transport,
      });
      const socket = await client.agent.v1.connect({ reconnectAttempts: 0 });
      const opened = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("open timeout")), 1000);
        socket.on("open", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      const received = new Promise((resolve) => socket.on("message", resolve));

      socket.connect();
      await opened;
      emitMessage(new Uint8Array([1, 2, 3]).buffer);
      const message = await received;

      if (!(message instanceof Blob)) {
        throw new Error("expected the SDK callback to receive Blob");
      }
      const bytes = new Uint8Array(await message.arrayBuffer());
      if (bytes.join(",") !== "1,2,3") {
        throw new Error("SDK Blob did not preserve binary payload");
      }
      socket.close();
    `;
    const subprocess = Bun.spawn([process.execPath, "--eval", source], {
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });
    const [exitCode, stderr] = await Promise.all([
      subprocess.exited,
      new Response(subprocess.stderr).text(),
    ]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
  });
});
