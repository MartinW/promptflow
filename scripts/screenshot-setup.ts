import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const URL = process.env.SCREENSHOT_URL ?? "http://localhost:3003";
const AUTH_FILE = path.resolve(".auth/session.json");

fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: [
    "--incognito",
    "--disable-blink-features=AutomationControlled",
  ],
});

const context = await browser.newContext();
const page = await context.newPage();
await page.goto(URL);

console.log("Sign in via the browser window, then press Enter here to save the session...");
process.stdin.resume();
await new Promise<void>((resolve) => process.stdin.once("data", resolve));

await context.storageState({ path: AUTH_FILE });
await browser.close();

console.log(`Session saved to ${AUTH_FILE}`);
