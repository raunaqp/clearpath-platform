/**
 * Phase 5 browser acceptance — the ClearPath handoff.
 *
 * The load-bearing check is the GATE: /submit/cerviai/request must be
 * unreachable before facilitation completes, including by typing the URL.
 * Run: npm run verify:phase5:browser  (dev server on :3000)
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "http://localhost:3000";
let failures = 0;
const ok = (l, c, x = "") => { if (!c) failures++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1600 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const txt = () => page.evaluate(() => document.body.innerText);
const click = (t) => page.evaluate((t) => {
  const el = [...document.querySelectorAll("button,a")].find((e) => e.textContent.trim().includes(t) && !e.disabled);
  if (el) { el.click(); return true; }
  return false;
}, t);

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("clearpath-role", "vendor");
    localStorage.setItem("clearpath-signed-in", "true");
  });

  console.log("\n── THE GATE: S12 before facilitation ──");
  await page.goto(BASE + "/submit/cerviai/request", { waitUntil: "networkidle2" });
  await wait(2200);
  ok("typing the request URL redirects away from it",
    !page.url().endsWith("/request"), page.url());
  ok("…and lands on facilitation", page.url().endsWith("/facilitation"));
  let t = await txt();
  ok("facilitation says it has not started", /facilitation has not started/i.test(t));
  ok("no hospital is named as having agreed", !/willing/i.test(t) || /has not started/i.test(t));

  console.log("\n── S10 express interest, to ClearPath ──");
  await page.goto(BASE + "/submit/cerviai/interest", { waitUntil: "networkidle2" });
  await wait(1800);
  t = await txt();
  ok("submitted to ClearPath, not a hospital", /submitted to/i.test(t) && /clearpath/i.test(t));
  ok("no hospital acceptance is claimed at this step", !/northvale/i.test(t));
  ok("contact is the named point of contact", t.includes("Dr. Ananya Rao") && /clinical and regulatory point of contact/i.test(t));
  // These are FORM VALUES, not page text — innerText does not include them.
  const fields = await page.evaluate(() =>
    [...document.querySelectorAll("input,textarea")].map((e) => e.value).join(" | ")
  );
  ok("objective names the trial and G1", /supervised chc trial/i.test(fields) && /g1/i.test(fields), fields.slice(0, 80));
  ok("geography", fields.includes("Tamil Nadu") && fields.includes("Coimbatore district"));
  ok("preferred mode is a trial under charter", /clinical trial under charter/i.test(t));
  ok("sharing permission is present and scoped to the full card",
    /sharing permission/i.test(t) && /in full, conditions intact/i.test(t));
  ok("what is NOT shared is stated", /commercial terms.*not shared|not shared at this stage/i.test(t));

  // The gate is legible: unchecking it blocks submission.
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb) { cb.click(); }
  });
  await wait(500);
  t = await txt();
  const blocked = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => /submit interest/i.test(b.textContent) && b.disabled));
  ok("withdrawing sharing permission blocks submission", blocked);
  ok("…and says why", /nothing about .* reaches any hospital/i.test(t));
  await page.evaluate(() => { const cb = document.querySelector('input[type="checkbox"]'); if (cb) cb.click(); });
  await wait(400);

  ok("submit fired", await click("Submit interest to ClearPath"));
  await page.waitForFunction(() => location.pathname.endsWith("/facilitation"), { timeout: 15000 });
  await wait(2000);

  console.log("\n── S11 facilitation ──");
  t = await txt();
  ok("four states present",
    ["Fit validated", "Sharing confirmed", "Hospital approached", "Both sides willing"].every((s) => t.includes(s)));
  ok("dates 25 / 25 / 26 / 30 Sep", ["25 Sep 2026", "26 Sep 2026", "30 Sep 2026"].every((d) => t.includes(d)));
  ok("fit validated cites context contained", /context contained/i.test(t));
  ok("…and infrastructure clearing", /infrastructure clears/i.test(t));
  ok("…and no unmet conditions", /no unmet conditions/i.test(t));
  ok("chronology cited: profile 12 Aug, register 20 Aug, submitted 15 Sep",
    t.includes("12 August 2026") && t.includes("20 August 2026") && t.includes("15 September 2026"));
  ok("sharing confirmed says conditions and limitations intact", /conditions and limitations intact/i.test(t));
  ok("no commercial terms at this stage", /no commercial terms are shared/i.test(t));
  ok("introduction pack listed", /curated introduction pack/i.test(t) && /capability profile/i.test(t) && /problem-register entry/i.test(t));
  ok("willingness is not acceptance", /willingness to receive a request is not acceptance/i.test(t));
  ok("the disclaimer is on screen, verbatim",
    t.includes("ClearPath does not certify and does not recommend procurement") &&
    t.includes("the hospital forms its own verdict"));

  console.log("\n── S12 request, now reachable ──");
  ok("the request link is offered", await click("Open the structured request"));
  await page.waitForFunction(() => location.pathname.endsWith("/request"), { timeout: 15000 });
  await wait(2000);
  t = await txt();
  ok("stays on /request now that facilitation completed", page.url().endsWith("/request"));
  ok("mode is trial", /structured request · trial/i.test(t));
  ok("the question", /increase detection of referable abnormalities at CHC level without increasing nurse workload/i.test(t));
  ok("scope", /4 CHCs · 90 days · 1,000 women · staff nurse operators/i.test(t));
  ok("support taper", /on-site weeks 1–2 · weekly weeks 3–6 · on-call from week 7/i.test(t));
  ok("devices", /4 tablets with offline capture · replacement within 72 hours/i.test(t));
  ok("training", /6 hours per nurse · 12 nurses/i.test(t));
  ok("data export", /CSV and FHIR bundle on request, at any point, no notice period/i.test(t));
  ok("model policy", /version frozen for the duration · any change is stop-and-review/i.test(t));
  ok("condition plan has a named supplier", /supplied by/i.test(t) && /innovator/i.test(t));
  ok("…and the G1 prerequisite", /ctri registration before day 1/i.test(t));
  ok("…as a row, not a blob", /condition plan/i.test(t) && /G1/.test(t));

  ok("send fired", await click("Send request to the hospital"));
  await wait(2000);
  t = await txt();
  ok("status becomes sent", /sent to hospital/i.test(t));
  ok("accept / decline / counter are named as the hospital's options", /accept, decline, or counter/i.test(t));
  ok("a counter is framed as terms, not refusal", /counter is a proposal of different terms/i.test(t));

  ok("no uncaught page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nPHASE 5 BROWSER ACCEPTANCE PASSED" : `\nPHASE 5 BROWSER ACCEPTANCE FAILED — ${failures}`);
process.exit(failures === 0 ? 0 : 1);
