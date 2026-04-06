import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // loadEnv reads the .env file directly (returns literal op:// strings).
  // For the token proxy we use process.env instead, which has the real secret
  // injected by `op run --env-file examples/.env` before the process starts.
  void loadEnv(mode, process.cwd(), ""); // keep for any non-secret Vite vars
  // DEEPGRAM_API_KEY is server-side only — never exposed to the browser bundle.
  // The /api/token proxy exchanges it for a short-lived Bearer token.
  const preact = (sub: string) =>
    path.resolve(`../packages/widget/node_modules/preact/${sub}`);

  return {
    resolve: {
      alias: {
        // Workspace packages → source files for instant HMR
        "@deepgram/agent-widget":              path.resolve("../packages/widget/src/index.ts"),
        "@deepgram/agent-react-ui/styles.css": path.resolve("../packages/react-ui/src/styles.css"),
        "@deepgram/agent-react-ui":            path.resolve("../packages/react-ui/src/index.ts"),
        "@deepgram/agent-react":    path.resolve("../packages/react/src/index.ts"),
        "@deepgram/agent":          path.resolve("../packages/sdk/src/index.ts"),

        // React → Preact compat (all packages share widget's preact install)
        // esbuild injects react/jsx-dev-runtime in dev and react/jsx-runtime in prod
        // for automatic JSX transform — both must be aliased.
        "react/jsx-dev-runtime": preact("jsx-runtime"),   // preact has no jsx-dev-runtime
        "react/jsx-runtime":     preact("jsx-runtime"),
        "react-dom":             preact("compat"),
        "react":                 preact("compat"),

        // Explicit preact sub-paths (widget source imports these directly)
        "preact/jsx-dev-runtime": preact("jsx-runtime"),  // same: no separate dev runtime
        "preact/jsx-runtime":     preact("jsx-runtime"),
        "preact/hooks":           preact("hooks"),
        "preact/compat":          preact("compat"),
        "preact":                 preact(""),
      },
    },

    // Let esbuild use the automatic JSX transform with `react` as the source.
    // Since `react` is aliased to preact/compat, and react/jsx-runtime is aliased
    // to preact/jsx-runtime, all TSX files (both react and widget packages) end up
    // using the same Preact runtime — no explicit jsxImportSource needed.
    esbuild: {
      jsx: "automatic",
    },

    plugins: [
      // ── Token proxy ────────────────────────────────────────────────────────
      // GET /api/token  →  POST api.deepgram.com/v1/auth/grant
      // Called on-demand when the widget connects, not at server start.
      // The API key stays server-side; the browser only ever sees the 30s token.
      {
        name: "deepgram-token-proxy",
        configureServer(server) {
          server.middlewares.use("/api/token", async (_req, res) => {
            const apiKey = process.env.DEEPGRAM_API_KEY;

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: "DEEPGRAM_API_KEY not set — copy examples/.env.example to examples/.env",
              }));
              return;
            }

            console.log(`[token-proxy] key: ${apiKey.slice(0, 8)}… (${apiKey.length} chars)`);

            try {
              const upstream = await fetch(
                "https://api.deepgram.com/v1/auth/grant",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Token ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ ttl_seconds: 30 }),
                },
              );

              const data = await upstream.json() as Record<string, unknown>;

              console.log(`[token-proxy] ${upstream.status}`, JSON.stringify(data));

              if (!upstream.ok || !data.access_token) {
                res.statusCode = upstream.status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ status: upstream.status, upstream: data }));
                return;
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Cache-Control", "no-store");
              res.end(JSON.stringify({ token: data.access_token }));
            } catch (err) {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        },
      },

      // ── UMD bundle server ─────────────────────────────────────────────
      // Serves packages/widget/dist/widget.umd.js at /widget.umd.js so the
      // bundled UMD examples can load it without a symlink or copy step.
      {
        name: "widget-umd",
        configureServer(server) {
          server.middlewares.use("/widget.umd.js", (_req, res) => {
            const dist = path.resolve("../packages/widget/dist/widget.umd.js");
            if (!fs.existsSync(dist)) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Widget not built — run: bun run build in packages/widget" }));
              return;
            }
            res.setHeader("Content-Type", "application/javascript");
            res.setHeader("Cache-Control", "no-store");
            res.end(fs.readFileSync(dist));
          });
        },
      },
    ],

    server: {
      fs: {
        // Allow serving files from the monorepo root so Vite can resolve and
        // hot-reload source files in ../packages/* via the alias map.
        allow: [path.resolve("..")],
      },
    },

    optimizeDeps: {
      exclude: ["preact", "preact/compat", "preact/hooks", "preact/jsx-runtime"],
    },

    build: {
      rollupOptions: {
        input: {
          main:           path.resolve("index.html"),
          sidebar:        path.resolve("01-widget-sidebar/index.html"),
          inline:         path.resolve("02-widget-inline/index.html"),
          floating:       path.resolve("03-widget-floating/index.html"),
          button:         path.resolve("04-widget-button/index.html"),
          embedded:       path.resolve("05-widget-embedded/index.html"),
          orb:            path.resolve("06-widget-orb/index.html"),
          floatingOrb:    path.resolve("07-widget-floating-orb/index.html"),
          reactSidebar:   path.resolve("10-react-sidebar/index.html"),
          reactInline:    path.resolve("11-react-inline/index.html"),
          reactFloating:  path.resolve("12-react-floating/index.html"),
          reactUi:        path.resolve("13-react-ui-standalone/index.html"),
          reactVoice:     path.resolve("14-react-ui-voice-button/index.html"),
          reactOrb:       path.resolve("15-react-ui-orb/index.html"),
          // UMD pages are static HTML — no bundling needed, excluded from build
        },
      },
    },
  };
});
