/**
 * Lightweight production server for examples.
 * Serves the built dist/ folder + /api/token proxy + /widget.umd.js.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = Number(process.env.PORT) || 8080;
const DIST = join(import.meta.dirname, "dist");
const UMD = join(import.meta.dirname, "../packages/widget/dist/widget.umd.js");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".wav": "audio/wav",
  ".map": "application/json",
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Token proxy
    if (url.pathname === "/api/token") {
      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) return Response.json({ error: "DEEPGRAM_API_KEY not set" }, { status: 500 });
      try {
        const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
          method: "POST",
          headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl_seconds: 30 }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (!res.ok || !data.access_token) return Response.json({ status: res.status, upstream: data }, { status: res.status });
        return Response.json({ token: data.access_token }, { headers: { "Cache-Control": "no-store" } });
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 502 });
      }
    }

    // UMD bundle
    if (url.pathname === "/widget.umd.js") {
      if (!existsSync(UMD)) return Response.json({ error: "Widget not built" }, { status: 404 });
      return new Response(readFileSync(UMD), { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } });
    }

    // Static files from dist/
    let filePath = join(DIST, url.pathname);
    if (url.pathname.endsWith("/")) filePath = join(filePath, "index.html");
    if (!extname(filePath) && !existsSync(filePath)) filePath += "/index.html";

    if (existsSync(filePath)) {
      const ext = extname(filePath);
      return new Response(readFileSync(filePath), {
        headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Examples server listening on http://0.0.0.0:${PORT}`);
