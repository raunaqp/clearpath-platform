/**
 * DOM snapshot — the guard for pure refactors.
 *
 * Captures the rendered innerHTML of the routes below so a "no behaviour
 * change" claim can be DIFFED rather than asserted. Usage:
 *
 *   node scripts/dom-snapshot.mjs /tmp/before
 *   ...refactor...
 *   node scripts/dom-snapshot.mjs /tmp/after
 *   diff -r /tmp/before /tmp/after
 *
 * State is normalised before every capture (localStorage cleared, demo data
 * reset) so two runs of the same code produce identical bytes. Verify that
 * assumption by snapshotting twice before touching anything.
 */
import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/dom-snapshot.mjs <out-dir>");
  process.exit(2);
}

// Routes under refactor. Each is captured after its content has settled.
const ROUTES = [
  { path: "/hospital", settle: "assess tool applications" },
  { path: "/registry", settle: "registry" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });

try {
  mkdirSync(outDir, { recursive: true });

  // Normalise: signed in as hospital (both routes render under the product
  // header), demo data reset to fixtures, no leftover persona.
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("clearpath-role", "hospital");
    localStorage.setItem("clearpath-signed-in", "true");
  });

  for (const { path, settle } of ROUTES) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction((s) => document.body.innerText.toLowerCase().includes(s), { timeout: 15000 }, settle)
      .catch(() => {});
    await sleep(1200); // let the mock latency + any charts finish
    const html = await page.evaluate(() => document.querySelector("main")?.innerHTML ?? "");
    const file = `${outDir}/${path.replace(/\//g, "_") || "_root"}.html`;
    writeFileSync(file, html);
    console.log(`captured ${path} → ${file} (${html.length} bytes)`);
  }
} finally {
  await browser.close();
}
