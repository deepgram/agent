/**
 * Sends KeepAlive pings on a fixed interval to prevent idle WebSocket
 * disconnections. Deepgram closes connections after ~15s of silence.
 */
export class KeepAliveTimer {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly intervalMs: number,
    private readonly ping: () => void,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(this.ping, this.intervalMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
