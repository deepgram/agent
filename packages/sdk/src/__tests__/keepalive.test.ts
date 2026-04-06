import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { KeepAliveTimer } from "../connection/keepalive.js";

describe("KeepAliveTimer", () => {
  let ping: jest.Mock;
  let timer: KeepAliveTimer;

  beforeEach(() => {
    jest.useFakeTimers();
    ping = jest.fn();
    timer = new KeepAliveTimer(1000, ping);
  });

  afterEach(() => {
    timer.stop();
    jest.useRealTimers();
  });

  it("calls ping at the specified interval", () => {
    timer.start();

    expect(ping).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(ping).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(ping).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(3000);
    expect(ping).toHaveBeenCalledTimes(5);
  });

  it("does not fire before interval elapses", () => {
    timer.start();
    jest.advanceTimersByTime(999);
    expect(ping).not.toHaveBeenCalled();
  });

  it("is idempotent — calling start() twice does not create duplicate intervals", () => {
    timer.start();
    timer.start();

    jest.advanceTimersByTime(1000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("stop() prevents further pings", () => {
    timer.start();
    jest.advanceTimersByTime(1000);
    expect(ping).toHaveBeenCalledTimes(1);

    timer.stop();
    jest.advanceTimersByTime(5000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("stop() is safe to call when not running", () => {
    expect(() => timer.stop()).not.toThrow();
  });

  it("can be restarted after stop", () => {
    timer.start();
    jest.advanceTimersByTime(2000);
    expect(ping).toHaveBeenCalledTimes(2);

    timer.stop();
    jest.advanceTimersByTime(2000);
    expect(ping).toHaveBeenCalledTimes(2);

    timer.start();
    jest.advanceTimersByTime(1000);
    expect(ping).toHaveBeenCalledTimes(3);
  });
});
