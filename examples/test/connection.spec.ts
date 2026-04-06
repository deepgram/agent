import { test, expect } from "@playwright/test";

test("agent connects and stays stable for 10s", async ({ page }) => {
  const logs: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() !== "debug") {
      logs.push(text);
      if (text.includes("dg-agent") || msg.type() === "error") {
        console.log(`  BROWSER [${msg.type()}]: ${text}`);
      }
    }
  });

  page.on("pageerror", (err) => {
    console.error(`  PAGE ERROR: ${err.message}`);
  });

  await page.goto("/01-widget-sidebar/");

  await page.getByRole("button", { name: "Open Agent" }).click();
  await page.getByRole("button", { name: "Start" }).click();

  // onConnect callback fires when state → "connected" (after WebSocket open)
  await expect
    .poll(() => logs.join("\n"), { timeout: 20_000, intervals: [500] })
    .toContain("[dg-agent] connected");

  console.log("✓ connected");

  // Hold for 10s — no reconnects should fire
  await page.waitForTimeout(10_000);

  const reconnects = logs.filter(l => l.includes("reconnecting") || l.includes("disconnected"));
  expect(reconnects, "connection should be stable with no reconnects").toHaveLength(0);

  console.log("✓ stable for 10s");
});
