import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "/tmp/clearpath-shots";
import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
for (const [path, name] of [["/", "home"], ["/hospitals", "hospitals"], ["/vendors", "vendors"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`shot: ${OUT}/${name}.png`);
}
await browser.close();
