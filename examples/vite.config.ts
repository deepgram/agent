import { defineConfig, loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // loadEnv with prefix '' exposes ALL .env vars to the config context only —
  // nothing is injected into the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // Resolve workspace packages directly from source for instant HMR —
    // no build step needed during development.
    resolve: {
      alias: {
        "@deepgram/agent-widget": path.resolve("../packages/widget/src/index.ts"),
        "@deepgram/agent-react":  path.resolve("../packages/react/src/index.ts"),
        "@deepgram/agent":        path.resolve("../packages/sdk/src/index.ts"),
        // Preact aliases — all packages in the monorepo share the single preact
        // copy installed in packages/widget/node_modules. esbuild's JSX transform
        // (jsxImportSource: "preact") injects preact/jsx-dev-runtime at dev time
        // and preact/jsx-runtime at build time; both must be aliased explicitly.
        "react":                    path.resolve("../packages/widget/node_modules/preact/compat"),
        "react-dom":                path.resolve("../packages/widget/node_modules/preact/compat"),
        "react/jsx-runtime":        path.resolve("../packages/widget/node_modules/preact/jsx-runtime"),
        "preact/jsx-runtime":       path.resolve("../packages/widget/node_modules/preact/jsx-runtime"),
        // Preact has no jsx-dev-runtime; redirect to jsx-runtime for both modes
        "preact/jsx-dev-runtime":   path.resolve("../packages/widget/node_modules/preact/jsx-runtime"),
        "preact/hooks":             path.resolve("../packages/widget/node_modules/preact/hooks"),
        "preact/compat":            path.resolve("../packages/widget/node_modules/preact/compat"),
        "preact":                   path.resolve("../packages/widget/node_modules/preact"),
      },
    },

    // Use esbuild's built-in JSX transform pointed at Preact's automatic runtime.
    // This avoids @vitejs/plugin-react forcing preact/* into dep optimisation.
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "preact",
    },

    plugins: [
      // ── Token proxy ──────────────────────────────────────────────────────
      // POST /api/token  →  POST api.deepgram.com/v1/auth/grant
      // Exchanges DEEPGRAM_API_KEY (server-side) for a short-lived access
      // token (30 s). The API key is never sent to the browser.
      {
        name: "deepgram-token-proxy",
        configureServer(server) {
          server.middlewares.use(
            "/api/token",
            async (_req, res) => {
              const apiKey = env.DEEPGRAM_API_KEY;

              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error:
                      "DEEPGRAM_API_KEY is not set. Copy examples/.env.example to examples/.env and fill in your key.",
                  }),
                );
                return;
              }

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

                const data = (await upstream.json()) as {
                  access_token?: string;
                  error?: string;
                };

                if (!upstream.ok || !data.access_token) {
                  res.statusCode = upstream.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ error: data.error ?? "token grant failed" }),
                  );
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
            },
          );
        },
      },
    ],

    // Exclude aliased Preact packages from Vite's dep pre-bundler.
    // They're resolved via the alias map, so pre-bundling would fail.
    optimizeDeps: {
      exclude: [
        "preact",
        "preact/compat",
        "preact/hooks",
        "preact/jsx-runtime",
        "preact/jsx-dev-runtime",
      ],
    },

    // Multi-page app — each HTML file is its own entry point
    build: {
      rollupOptions: {
        input: {
          main:     path.resolve("index.html"),
          sidebar:  path.resolve("sidebar.html"),
          inline:   path.resolve("inline.html"),
          floating: path.resolve("floating.html"),
        },
      },
    },
  };
});
