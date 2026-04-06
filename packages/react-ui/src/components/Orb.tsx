import { useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrbState = "idle" | "connecting" | "listening" | "speaking";

export interface OrbProps {
  /** Agent state — controls animation speed, deflation, rocking. */
  state?: OrbState;
  /** Current agent output volume (0–1). Drives the "chatter" effect. */
  agentVolume?: number;
  /** Current user input volume (0–1). Drives the inverse chatter. */
  userVolume?: number;
  /** Size in px. Default: 200. */
  size?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants (from deepgram/browser-agent hoop.ts)
// ---------------------------------------------------------------------------

const PULSE_PERIOD_SECONDS = 3;
const PULSE_SIZE_MULTIPLIER = 1.02;
const AVERAGE_ROTATION_PERIOD_SECONDS = 6;
const ROCKING_PERIOD_SECONDS = 3;
const ROCKING_TRANSITION_TIME_MS = 1000;
const DEFLATE_PULL = 2;
const DEFLATE_TRANSITION_TIME_MS = 1000;
const INFLATE_TRANSITION_TIME_MS = 300;
const CHATTER_SIZE_MULTIPLIER = 1.15;
const CHATTER_WINDOW_SIZE = 3;
const CHATTER_FRAME_LAG = 5;

const pi = (n: number): number => Math.PI * n;

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const Color = {
  springGreen: "#13ef93cc",
  magenta: "#ee028ccc",
  lightPurple: "#ae63f9cc",
  lightBlue: "#14a9fbcc",
  green: "#a1f9d4cc",
  transparent: "transparent",
} as const;

interface Point { x: number; y: number }
interface ColorStop { pct: number; color: string }
interface LineConfig {
  segments: ColorStop[];
  startAngle: number;
  speedMultiplier: number;
  centerOffset: Point;
  radiusOffset: number;
  width: number;
}

const lines: LineConfig[] = [
  {
    segments: [
      { pct: 0.42, color: Color.transparent },
      { pct: 0.61, color: Color.magenta },
    ],
    startAngle: 3.52, speedMultiplier: 1.21,
    centerOffset: { x: 0.01, y: -0.01 }, radiusOffset: 0.02, width: 3.38,
  },
  {
    segments: [
      { pct: 0.28, color: Color.springGreen },
      { pct: 0.62, color: Color.magenta },
      { pct: 0.8, color: Color.transparent },
    ],
    startAngle: 1.59, speedMultiplier: 0.64,
    centerOffset: { x: -0.03, y: -0.01 }, radiusOffset: 0.05, width: 2.39,
  },
  {
    segments: [
      { pct: 0.1, color: Color.transparent },
      { pct: 0.31, color: Color.green },
      { pct: 0.45, color: Color.lightBlue },
      { pct: 0.66, color: Color.lightPurple },
    ],
    startAngle: 2.86, speedMultiplier: 0.94,
    centerOffset: { x: 0.02, y: 0.02 }, radiusOffset: -0.06, width: 2.64,
  },
  {
    segments: [
      { pct: 0.1, color: Color.lightPurple },
      { pct: 0.5, color: Color.transparent },
      { pct: 0.9, color: Color.green },
    ],
    startAngle: 5.67, speedMultiplier: 1.3,
    centerOffset: { x: -0.01, y: 0.01 }, radiusOffset: 0.04, width: 2.95,
  },
];

const LINE_COUNT = lines.length;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const coordsFrom = (p: Point, d: number, a: number): Point => ({
  x: p.x + d * Math.cos(a), y: p.y + d * Math.sin(a),
});

const lerp = (a: number, b: number, t: number): number => t * (b - a) + a;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const easeInOutQuad = (x: number): number =>
  x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

interface Shape {
  time: number;
  speed: number;
  deflation: number;
  rockingAngle: number;
  agentNoise: number[];
  userNoise: number[];
  // Transition targets
  targetDeflation: number;
  targetRocking: number;
  transitionStart: number;
  startDeflation: number;
  startRocking: number;
}

function makeGradient(
  ctx: CanvasRenderingContext2D, offset: Point, angle: number, parts: ColorStop[],
): CanvasGradient {
  const w = ctx.canvas.width / 2;
  const h = ctx.canvas.height / 2;
  const g = ctx.createLinearGradient(
    w * (1 - Math.cos(angle) + offset.x),
    h * (1 - Math.sin(angle) + offset.y),
    w * (1 + Math.cos(angle) + offset.x),
    h * (1 + Math.sin(angle) + offset.y),
  );
  parts.forEach(({ pct, color }) => g.addColorStop(pct, color));
  return g;
}

function drawCrescent(
  ctx: CanvasRenderingContext2D, offset: Point, radius: number,
  deflDepth: number, deflAngle: number, gradient: CanvasGradient,
) {
  const w = ctx.canvas.width / 2;
  const h = ctx.canvas.height / 2;
  const center = { x: w * (1 + offset.x), y: h * (1 + offset.y) };
  const bezD = radius * (4 / 3) * Math.tan(pi(1 / 8));

  ctx.strokeStyle = gradient;
  ctx.beginPath();

  const arcStart = deflAngle + pi(1 / 2);
  const arcEnd = deflAngle + pi(3 / 2);
  ctx.arc(center.x, center.y, radius, arcStart, arcEnd, false);

  const start = coordsFrom(center, radius, arcEnd);
  const angleToX = pi(3 / 2) - deflAngle;
  const distDown = Math.cos(angleToX) * radius;
  const mid = coordsFrom(
    coordsFrom(center, radius, deflAngle),
    distDown * deflDepth * DEFLATE_PULL,
    pi(1 / 2),
  );
  const end = coordsFrom(center, radius, arcStart);

  ctx.bezierCurveTo(
    ...Object.values(coordsFrom(start, bezD, arcEnd + pi(1 / 2))) as [number, number],
    ...Object.values(coordsFrom(mid, bezD, deflAngle + pi(3 / 2))) as [number, number],
    mid.x, mid.y,
  );
  ctx.bezierCurveTo(
    ...Object.values(coordsFrom(mid, bezD, deflAngle + pi(1 / 2))) as [number, number],
    ...Object.values(coordsFrom(end, bezD, arcStart + pi(3 / 2))) as [number, number],
    end.x, end.y,
  );
  ctx.stroke();
}

function rollingAvg(noise: number[], start: number): number {
  const win = noise.slice(start, start + CHATTER_WINDOW_SIZE);
  return win.reduce((a, b) => a + b, 0) / win.length;
}

function drawFrame(ctx: CanvasRenderingContext2D, shape: Shape, dt: number) {
  shape.time += dt * lerp(1, shape.speed, shape.deflation);

  // Transition deflation and rocking
  const elapsed = performance.now() - shape.transitionStart;
  if (shape.deflation !== shape.targetDeflation) {
    const dur = shape.targetDeflation > shape.startDeflation
      ? DEFLATE_TRANSITION_TIME_MS : INFLATE_TRANSITION_TIME_MS;
    const p = easeInOutQuad(clamp01(elapsed / dur));
    shape.deflation = p >= 1 ? shape.targetDeflation
      : lerp(shape.startDeflation, shape.targetDeflation, p);
  }
  if (shape.rockingAngle !== shape.targetRocking) {
    const p = easeInOutQuad(clamp01(elapsed / ROCKING_TRANSITION_TIME_MS));
    shape.rockingAngle = p >= 1 ? shape.targetRocking
      : lerp(shape.startRocking, shape.targetRocking, p);
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const maxR = Math.min(ctx.canvas.width, ctx.canvas.height) / 2;
  const pulse = 1 + (PULSE_SIZE_MULTIPLIER - 1)
    * Math.sin(shape.time * pi(1) / PULSE_PERIOD_SECONDS / 1000)
    * lerp(1, 0, shape.deflation);

  lines.forEach((line, i) => {
    ctx.lineWidth = line.width;
    ctx.shadowColor = line.segments[0].color;
    ctx.shadowBlur = line.width * 1.1;

    const agentChatter = lerp(1, CHATTER_SIZE_MULTIPLIER, rollingAvg(shape.agentNoise, i * CHATTER_FRAME_LAG));
    const userChatter = lerp(1, 1 / CHATTER_SIZE_MULTIPLIER, rollingAvg(shape.userNoise, i * CHATTER_FRAME_LAG));
    const r = maxR * 0.8 * agentChatter * userChatter * pulse;

    const gradient = makeGradient(
      ctx, line.centerOffset,
      line.startAngle + (shape.time * pi(1) / 1000 / AVERAGE_ROTATION_PERIOD_SECONDS) * line.speedMultiplier,
      line.segments,
    );

    drawCrescent(
      ctx, line.centerOffset,
      r + line.radiusOffset * r,
      easeInOutQuad(shape.deflation),
      pi(3 / 2) + Math.sin(shape.time * pi(2) / ROCKING_PERIOD_SECONDS / 1000) * shape.rockingAngle,
      gradient,
    );
  });
}

// ---------------------------------------------------------------------------
// State mapping
// ---------------------------------------------------------------------------

function deflationFor(state: OrbState): number {
  switch (state) {
    case "listening": case "speaking": return 0;
    case "connecting": return 0.65;
    case "idle": default: return 1;
  }
}

function rockingFor(state: OrbState): number {
  switch (state) {
    case "listening": case "speaking": return pi(1 / 15);
    case "connecting": return pi(1 / 15);
    case "idle": default: return pi(1 / 2);
  }
}

function speedFor(state: OrbState): number {
  switch (state) {
    case "listening": case "speaking": return 1;
    case "connecting": return 0.5;
    case "idle": default: return 0.2;
  }
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * Deepgram animated orb — the signature hoop visualization.
 *
 * Canvas 2D rendering of 4 crescent arcs with gradient colors that:
 * - Rotate continuously
 * - Pulse gently when active
 * - "Chatter" (expand/contract) in response to agent/user volume
 * - Deflate into a pinched shape when idle, inflate when active
 * - Rock with variable amplitude based on state
 *
 * Ported from deepgram/browser-agent `hoop.ts`.
 *
 * @example
 * ```tsx
 * <Orb
 *   state={mode === "speaking" ? "speaking" : mode === "listening" ? "listening" : "idle"}
 *   agentVolume={getOutputVolume()}
 *   userVolume={getInputVolume()}
 *   size={200}
 * />
 * ```
 */
export function Orb({
  state = "idle",
  agentVolume = 0,
  userVolume = 0,
  size = 200,
  className,
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapeRef = useRef<Shape>({
    time: 0,
    speed: speedFor("idle"),
    deflation: deflationFor("idle"),
    rockingAngle: rockingFor("idle"),
    agentNoise: Array(LINE_COUNT * CHATTER_FRAME_LAG + CHATTER_WINDOW_SIZE).fill(0),
    userNoise: Array(LINE_COUNT * CHATTER_FRAME_LAG + CHATTER_WINDOW_SIZE).fill(0),
    targetDeflation: deflationFor("idle"),
    targetRocking: rockingFor("idle"),
    transitionStart: 0,
    startDeflation: deflationFor("idle"),
    startRocking: rockingFor("idle"),
  });

  // Update state transitions
  useEffect(() => {
    const shape = shapeRef.current;
    shape.speed = speedFor(state);
    shape.transitionStart = performance.now();
    shape.startDeflation = shape.deflation;
    shape.startRocking = shape.rockingAngle;
    shape.targetDeflation = deflationFor(state);
    shape.targetRocking = rockingFor(state);
  }, [state]);

  // Push volume samples into noise buffers
  useEffect(() => {
    const shape = shapeRef.current;
    shape.agentNoise.shift();
    shape.agentNoise.push(agentVolume);
  }, [agentVolume]);

  useEffect(() => {
    const shape = shapeRef.current;
    shape.userNoise.shift();
    shape.userNoise.push(userVolume);
  }, [userVolume]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let raf = 0;

    function loop(now: number) {
      const dt = now - last;
      last = now;
      drawFrame(ctx!, shapeRef.current, dt);
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const cleanup = animate();
    return cleanup;
  }, [animate]);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-agent-orb
      data-orb-state={state}
      width={size * dpr}
      height={size * dpr}
      style={{ width: size, height: size, display: "block" }}
      aria-hidden="true"
    />
  );
}
