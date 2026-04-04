# Test info

- Name: agent connects, receives SettingsApplied, stays stable for 10s
- Location: /Users/lukeoliff/Projects/deepgram/agent/examples/test/connection.spec.ts:3:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "SettingsApplied"
Received string:    "[debug] [vite] connecting...
[debug] [vite] connected.
[error] Failed to load resource: the server responded with a status of 404 (Not Found)
[debug] [vite] connecting...
[debug] [vite] connected."

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
    at /Users/lukeoliff/Projects/deepgram/agent/examples/test/connection.spec.ts:40:3
```

# Page snapshot

```yaml
- link "← Back to examples":
  - /url: /
- banner:
  - heading "Sidebar Layout" [level=1]
  - button "Open Agent"
- heading "How it works" [level=2]
- paragraph:
  - text: The widget is connected to
  - code: id="open-btn"
  - text: via the
  - code: buttonId
  - text: config option. Clicking the button slides the panel in from the right. The overlay dismisses the panel.
- img
- text: Voice Agent reconnecting…
- button "Close":
  - img
- img
- paragraph: Press Start to begin the conversation
- textbox "Type a message…"
- button "Send" [disabled]:
  - img
- button "Mute microphone":
  - img
- button "Mute speaker":
  - img
- button "Stop"
```

# Test source

```ts
   1 | import { test, expect } from "@playwright/test";
   2 |
   3 | test("agent connects, receives SettingsApplied, stays stable for 10s", async ({ page }) => {
   4 |   const logs: string[] = [];
   5 |   const errors: string[] = [];
   6 |
   7 |   page.on("console", (msg) => {
   8 |     const text = `[${msg.type()}] ${msg.text()}`;
   9 |     logs.push(text);
  10 |     if (msg.type() !== "debug" || msg.text().includes("dg-agent")) {
  11 |       console.log(`  BROWSER: ${text}`);
  12 |     }
  13 |   });
  14 |
  15 |   page.on("pageerror", (err) => {
  16 |     errors.push(err.message);
  17 |     console.error(`  PAGE ERROR: ${err.message}`);
  18 |   });
  19 |
  20 |   await page.goto("/sidebar.html");
  21 |   await page.screenshot({ path: "test-results/01-loaded.png" });
  22 |
  23 |   await page.getByRole("button", { name: "Open Agent" }).click();
  24 |   await page.screenshot({ path: "test-results/02-panel-open.png" });
  25 |
  26 |   await page.getByRole("button", { name: "Start" }).click();
  27 |   await page.screenshot({ path: "test-results/03-after-start.png" });
  28 |
  29 |   // Brief wait to let connection attempt settle
  30 |   await page.waitForTimeout(3_000);
  31 |   await page.screenshot({ path: "test-results/04-after-3s.png" });
  32 |
  33 |   console.log("\n--- Page errors ---");
  34 |   errors.forEach(e => console.log(" ERROR:", e));
  35 |
  36 |   console.log("\n--- All console logs ---");
  37 |   logs.forEach(l => console.log(" ", l));
  38 |
  39 |   // Wait for SettingsApplied
> 40 |   await expect
     |   ^ Error: expect(received).toContain(expected) // indexOf
  41 |     .poll(() => logs.join("\n"), { timeout: 15_000, intervals: [500] })
  42 |     .toContain("SettingsApplied");
  43 | });
  44 |
```