/**
 * Proxy server for the Deepgram Console Agent.
 *
 * Uses composite-voice's built-in Express proxy middleware to forward
 * browser requests to Deepgram (STT/TTS via WebSocket) and Anthropic
 * (LLM via HTTP) with API keys injected server-side.
 *
 * Usage:
 *   DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=... bun server.ts
 *
 * Environment variables:
 *   DEEPGRAM_API_KEY  — Required. Deepgram API key for STT + TTS.
 *   ANTHROPIC_API_KEY — Required. Anthropic API key for Claude LLM.
 *   PORT              — Optional. Server port (default: 3001).
 *   CORS_ORIGIN       — Optional. Allowed CORS origins, comma-separated
 *                        (default: http://localhost:5173).
 */

import express from 'express';
import { createExpressProxy } from '@lukeocodes/composite-voice/proxy';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!deepgramApiKey || !anthropicApiKey) {
  console.error('Missing required environment variables: DEEPGRAM_API_KEY, ANTHROPIC_API_KEY');
  process.exit(1);
}

const app = express();

const proxy = createExpressProxy({
  deepgramApiKey,
  anthropicApiKey,
  pathPrefix: '/api/proxy',
  cors: { origins: CORS_ORIGINS },
});

// Patch response headers before the proxy writes them:
// - Strip Content-Encoding (proxy decodes gzip but keeps the header)
// - Allow all request headers in CORS (Anthropic SDK sends x-stainless-* etc.)
app.use((req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: string | number | readonly string[]) => {
    const lower = name.toLowerCase();
    if (lower === 'content-encoding') return res;
    if (lower === 'access-control-allow-headers') {
      return originalSetHeader(name, '*');
    }
    return originalSetHeader(name, value);
  };
  proxy.middleware(req, res, next);
});

// Health check (used by fly.io)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(PORT, () => {
  console.log(`Console agent proxy listening on :${PORT}`);
  console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`);
  console.log(`Routes: /api/proxy/anthropic (HTTP), /api/proxy/deepgram (WebSocket)`);
  proxy.attachWebSocket(server);
});
