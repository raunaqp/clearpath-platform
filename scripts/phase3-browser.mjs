/**
 * Phase 3 browser acceptance — THE outcome of the phase.
 *
 * A brand new submission, not one of the seeded fixtures and not loaded from an
 * example, runs S1 → S2 → S3 with a REAL uploaded file → S4 → S5 → S6.
 * Before this phase that journey dead-ended at "No sample documents for a
 * custom tool in this demo".
 *
 * Assumes the dev server is on http://localhost:3000.
 * Run: npm run verify:phase3:browser
 */
import puppeteer from "puppeteer-core";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "http://localhost:3000";
let failures = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A real file, written to a temp dir and genuinely selected through the input.
const dir = mkdtempSync(join(tmpdir(), "clearpath-"));
const FILE = join(dir, "acme-field-report.txt");
writeFileSync(FILE, "AcmeDerm field evaluation\nSite: CHC Ramnagar\nOperator: staff nurse\nn=340\n");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1600 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const txt = () => page.evaluate(() => document.body.innerText);
const click = (t) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("button,a,summary")].find(
      (e) => e.textContent.trim().includes(t) && !e.disabled
    );
    if (el) { el.click(); return true; }
    return false;
  }, t);
/**
 * Click, then verify it took — retrying if not.
 *
 * A plain click can land before React has hydrated: the button is in the
 * server-rendered HTML but its handler is not attached yet, so the click is
 * swallowed and the next wait times out somewhere unrelated. Idle, hydration is
 * instant and this never shows; after a ninety-second suite on the same dev
 * server it does. Retrying until the click has an observable effect is the
 * honest fix — waiting on the condition rather than assuming the first attempt
 * worked.
 */
/**
 * Navigate the wizard by STAGE LABEL, reading the rail's data-wizard-stage
 * rather than counting "Continue" clicks. See the same helper in
 * browser-verify.mjs for why counting clicks was a liability.
 */
const wizardStage = () =>
  page.evaluate(() =>
    document.querySelector('[data-wizard-stage][data-state="active"]')?.getAttribute("data-wizard-stage") ?? null
  );

async function gotoWizardStage(label, max = 10) {
  for (let i = 0; i < max; i++) {
    if ((await wizardStage()) === label) return true;
    if (!(await click("Continue"))) break;
    await wait(900);
  }
  if ((await wizardStage()) === label) return true;
  ok(`wizard reaches the ${label} stage`, false, `stuck on ${(await wizardStage()) ?? "no stage rail"}`);
  return false;
}

async function clickUntil(text, predicate, { attempts = 5, gap = 1200 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await click(text);
    try {
      await page.waitForFunction(predicate, { timeout: gap });
      return true;
    } catch {
      // Not yet — hydration may still be in flight. Try again.
    }
  }
  return false;
}

const setField = (placeholderPrefix, value) =>
  page.evaluate((ph, v) => {
    const el = [...document.querySelectorAll("input,textarea")].find((e) =>
      (e.placeholder || "").startsWith(ph)
    );
    if (!el) return false;
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, placeholderPrefix, value);

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("clearpath-role", "vendor");
    localStorage.setItem("clearpath-signed-in", "true");
  });

  console.log("\n── S1 · Context declaration ──");
  await page.goto(BASE + "/submit", { waitUntil: "networkidle2" });
  ok(
    "the wizard opens (click retried until hydrated)",
    await clickUntil("Begin", () => !!document.querySelector('input[placeholder^="e.g. CerviAI"]'))
  );
  await page.type('input[placeholder^="e.g. CerviAI"]', "AcmeDerm");
  await page.type('input[placeholder^="e.g. CerviAI Health"]', "Acme Health");
  await setField("What the tool does", "Flags suspicious skin lesions for dermatology referral, in adults screened at CHC level by a staff nurse.");
  await setField("District, state", "Pune district, Maharashtra");
  await setField("30-65", "18-80");
  await wait(300);

  let t = await txt();
  // "Exact claim being assessed" and "Out of scope" are REMOVED from S1 — the
  // claim is carried by intended use, and a tool's non-scope is a card output,
  // not something asked for up front. Their absence is asserted here.
  ok("context panel renders (entity, build status, setting)",
    /context declaration/i.test(t) && /build status/i.test(t) && /procurement path/i.test(t) && /operator cadre/i.test(t));
  ok("…without the removed claim and scope fields",
    !/exact claim being assessed/i.test(t) && !/out of scope/i.test(t));
  ok("the six-stage rail is shown",
    ["Context", "Checklist", "Evidence", "Declaration", "Assessment", "Card"].every((s) => t.includes(s)));
  ok("context-lock notice present", t.includes("Context is fixed once submitted"));

  // Build status gates the whole flow.
  await click("Prototype");
  await wait(400);
  t = await txt();
  const blocked = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Continue") && b.disabled));
  ok("a prototype is told plainly that it is out of scope", t.includes("out of scope for this assessment"));
  ok("…and cannot continue", blocked);
  await click("Deployable build");
  await wait(400);

  // ── S2 is a STEP of its own now, not a panel folded into Evidence ────────
  await gotoWizardStage("Checklist");

  console.log("\n── S2 · Intake checklist, as its own step ──");
  t = await txt();
  ok("six checklist groups",
    ["Regulatory", "Clinical", "DPDP and security", "Interoperability", "Logistics", "Training"].every((g) => t.includes(g)));
  ok("completion is counted against lines, not a score", /required lines have a document/.test(t));
  ok("no percentage or score on the checklist", !/\d+\s?%/.test(t));
  // The whole reason the list is generated from context: the vendor sees what
  // is expected BEFORE meeting an upload control.
  ok("the checklist is reached before any evidence is attached", !t.includes("acme-field-report"));
  ok("every row can be attached against", (await page.evaluate(() => document.querySelectorAll('input[type="file"]').length)) > 5);

  // ── a checked row with NO document says so, rather than looking complete ──
  const naBefore = await txt();
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Doesn't apply");
    if (b) b.click();
  });
  await wait(500);
  t = await txt();
  ok("a row can be marked as not applying", t !== naBefore && /marked as not applying/i.test(t));
  ok("…and is named as a claim, not shown as complete",
    /this is a claim you are making/i.test(t) && /not a document on file/i.test(t));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Applies after all");
    if (b) b.click();
  });
  await wait(400);

  await gotoWizardStage("Evidence");
  console.log("\n── S3 · Evidence with a real upload ──");
  t = await txt();
  ok("THE DEAD END IS GONE (no 'no sample documents' copy)", !t.includes("No sample documents for a custom tool"));
  ok("files are labelled session-only", t.includes("Uploaded files are held for this session only"));

  const input = await page.$('input[type="file"]');
  await input.uploadFile(FILE);
  await wait(900);
  t = await txt();
  ok("a real file attaches", t.includes("acme-field-report"));
  ok("an unbound document is shown as counting for nothing", t.includes("counts for nothing"));

  await setField("Organisation that produced it", "Pune district health society");
  await setField("Who paid for it", "State programme budget");
  await setField("e.g. community health centre", "community health centre");
  await setField("e.g. staff nurse", "staff nurse");
  await setField("n", "340");
  await setField("e.g. single centre", "Single district. Does not cover other skin tones at scale.");
  await wait(400);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "G1");
    if (el) el.click();
  });
  await wait(600);
  t = await txt();
  ok("binding a document to a gate is reflected", t.includes("answers G1"));

  await gotoWizardStage("Declaration");

  console.log("\n── S4 · Innovator declaration ──");
  t = await txt();
  ok("titled 'Innovator declaration'", t.includes("Innovator declaration"));
  ok("sub-line names the independent assessment", t.includes("ClearPath assesses this independently in the next step"));
  // The "declaration completeness" band went with the questionnaire it counted.
  // What replaces it is a statement of what is ON FILE — no completeness, and
  // still no verdict.
  ok("an on-file band, not a completeness band and not a verdict band",
    /what is on file/i.test(t) && !/declaration completeness/i.test(t));
  ok("the word 'verdict' is absent from this screen", !/verdict/i.test(t));
  ok("no per-dimension percentages", !/D1 \d+%/.test(t));

  // The BODH pre-fill button is REMOVED, so nothing seeds the counter. The
  // N/17 literal itself is what the site-wide suite depends on, and it still
  // renders — starting at 0 and moving as questions are answered by hand.
  // THE QUESTIONNAIRE IS GONE. The vendor asserts nothing on this screen; it
  // summarises what they attached and what it establishes.
  ok("no gate questions to answer", !/\d+\/17 answered/.test(t)
    && !(await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Partial"))));
  ok("half one — what you attached", /what you attached/i.test(t) && t.includes("acme-field-report"));
  ok("…naming the gates that document answers", /answers G1/.test(t));
  ok("half two — what we found", /what we found/i.test(t));
  ok("…both the gates the documents carry and the ones nothing speaks to",
    /(carry|carries|carried)/i.test(t) && /don.t yet\s+establish/i.test(t.replace(/\s+/g, " ")));
  ok("…and gaps are named in words, not a gate-code label",
    /nothing on file/i.test(t) || /generated elsewhere/i.test(t) || /not independent/i.test(t));

  console.log("\n── S5 · Assessment transition ──");
  const submitted = await clickUntil(
    "Submit for assessment",
    () => location.pathname.includes("/assess"),
    { attempts: 4, gap: 6000 }
  );
  ok("submit button was clickable", submitted);
  try {
    await page.waitForFunction(() => location.pathname.includes("/assess"), { timeout: 20000 });
  } catch {
    console.log("DEBUG url:", await page.evaluate(() => location.pathname));
    console.log("DEBUG page:\n", (await txt()).slice(0, 900));
    console.log("DEBUG errors:", errors.join(" | "));
    throw new Error("did not reach /assess");
  }
  // The stages resolve one at a time over roughly three seconds. Wait for the
  // LAST one to land rather than sleeping a guessed interval — a fixed sleep
  // races the staged animation and fails intermittently.
  try {
    await page.waitForFunction(
      () => /evidence coverage/i.test(document.body.innerText),
      { timeout: 25000 }
    );
  } catch {
    console.log("DEBUG assess url:", await page.evaluate(() => location.pathname));
    console.log("DEBUG assess page:\n", (await txt()).slice(0, 700));
    console.log("DEBUG errors:", errors.join(" | "));
    throw new Error("assess stages never resolved");
  }
  await wait(400);
  t = await txt();
  // Middle stage renamed: there is no declaration to check any more, so it
  // says what it actually does — each gate against what is on file.
  ok("three resolving stages", t.includes("to gates and items") && t.includes("Checking each gate against what is on file") && t.includes("Scoring against the 17 demo gates"));
  ok("scope banner verbatim", t.includes("Full funded assessment covers 112 items and at least two blind independent assessors scoring in parallel with an AI pass"));
  ok("qualitative coverage only", /evidence coverage/i.test(t) && /(high|moderate|limited)/i.test(t));
  ok("NO numeric confidence or grounding figure", !/\d+\s?%/.test(t) && !/confidence/i.test(t));
  ok("NO 'of 112 items evidenced'", !/of 112 items evidenced/i.test(t));
  ok("a declaration with unevidenced trial-blocking gates is held, not issued",
    t.includes("Under assessment") || t.includes("UNDER ASSESSMENT"));
  ok("held is framed as a delay, not a denial", /delay, not a denial/i.test(t));
  // The page DOES contain the word, in the sentence that rules it out. What
  // must not appear is a rejection asserted as an outcome.
  ok("the vendor is never shown a rejection as an outcome",
    /nothing has been rejected/i.test(t) && !/(submission|application|tool) (was |is |has been )?rejected/i.test(t));

  console.log("\n── S6 · Card, from a fresh non-fixture submission ──");
  (await click("See the demonstration card")) || (await click("See the readiness card"));
  await page.waitForFunction(() => location.pathname.endsWith("/card"), { timeout: 20000 });
  // CSS text-transform:uppercase changes innerText in Chrome, so the column
  // header comes back as "SCORE (ILLUSTRATIVE)". Match case-insensitively —
  // the same gotcha browser-verify.mjs documents at the top of the file.
  await page.waitForFunction(
    () => /score \(illustrative\)/i.test(document.body.innerText),
    { timeout: 20000 }
  );
  t = await txt();
  ok("a real card id was generated", /CP-\d{4}-\d{4}-ACMEDERM-\d{3}/.test(t));
  ok("the card is bound to the DECLARED context, not a derived default",
    t.includes("Pune district, Maharashtra") && !t.includes("Context here is a default derived"));
  ok("the context band carries the declared setting", t.includes("CHC") && t.includes("staff nurse"));
  ok("the uploaded document appears as evidence on file", t.includes("acme-field-report"));
  ok("the 0-2 ladder, illustrative",
    /score \(illustrative\)/i.test(t) && t.includes("Illustrative fixture values, not validated measurements."));
  ok("no composite score anywhere on the card", !/\b\d{2,3}\s?\/\s?100\b/.test(t));

  ok("no uncaught page errors during the journey", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nPHASE 3 BROWSER ACCEPTANCE PASSED" : `\nPHASE 3 BROWSER ACCEPTANCE FAILED — ${failures}`);
process.exit(failures === 0 ? 0 : 1);
