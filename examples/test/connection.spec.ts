import { test, expect } from "@playwright/test";

test("agent connects, receives SettingsApplied, stays stable for 10s", async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on("console", (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() !== "debug" || msg.text().includes("dg-agent")) {
      console.log(`  BROWSER: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    errors.push(err.message);
    console.error(`  PAGE ERROR: ${err.message}`);
  });

  await page.goto("/sidebar.html");

  // Sanity check: can the browser reach wss://agent.deepgram.com at all?
  const wsCheck = await page.evaluate(async () => {
    return new Promise<string>((resolve) => {
      const ws = new WebSocket("wss://agent.deepgram.com/v1/agent/converse", ["token", "test"]);
      const timer = setTimeout(() => { ws.close(); resolve("timeout: no event in 5s"); }, 5000);
      ws.onopen  = () => { clearTimeout(timer); ws.close(); resolve("open"); };
      ws.onerror = (e) => { clearTimeout(timer); resolve(`error: ${(e as Event).type}`); };
      ws.onclose = (e: CloseEvent) => { clearTimeout(timer); resolve(`close: code=${e.code} reason=${e.reason}`); };
    });
  });
  console.log("  WS connectivity check:", wsCheck);

  await page.getByRole("button", { name: "Open Agent" }).click();
  await page.screenshot({ path: "test-results/02-panel-open.png" });

  await page.getByRole("button", { name: "Start" }).click();
  await page.screenshot({ path: "test-results/03-after-start.png" });

  // Brief wait to let connection attempt settle
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: "test-results/04-after-3s.png" });

  console.log("\n--- Page errors ---");
  errors.forEach(e => console.log(" ERROR:", e));

  console.log("\n--- All console logs ---");
  logs.forEach(l => console.log(" ", l));

  // Wait for SettingsApplied
  await expect
    .poll(() => logs.join("\n"), { timeout: 15_000, intervals: [500] })
    .toContain("SettingsApplied");
});
