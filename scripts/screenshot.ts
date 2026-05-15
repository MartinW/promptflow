import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const URL = process.env.SCREENSHOT_URL ?? "http://localhost:3003";
const OUTPUT = path.resolve(
  process.env.SCREENSHOT_OUTPUT ?? "docs/homepage.png"
);
const AUTH_FILE = path.resolve(".auth/session.json");

const dir = path.dirname(OUTPUT);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const browser = await chromium.launch();
const contextOptions = fs.existsSync(AUTH_FILE)
  ? { storageState: AUTH_FILE }
  : {};
const context = await browser.newContext(contextOptions);
const page = await context.newPage();

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle" });
await page.screenshot({ path: OUTPUT, fullPage: false });

await context.close();
await browser.close();

console.log(`Screenshot saved to ${OUTPUT}`);
