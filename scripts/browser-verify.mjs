/**
 * Browser verification (real Chrome). Assumes the dev server is running on
 * http://localhost:3000. Drives the UI and asserts the acceptance items.
 * Run: node scripts/browser-verify.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE || "http://localhost:3000";
let failures = 0;
const ok = (label, cond, extra = "") => { if (!cond) failures++; console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// innerText, lowercased (CSS text-transform:uppercase changes innerText in Chrome).
const body = (page) => page.evaluate(() => document.body.innerText.toLowerCase());
async function clickText(page, t, tag = "button, a") {
  return page.evaluate((t, tag) => {
    const el = [...document.querySelectorAll(tag)].find((e) => e.textContent.trim().includes(t) && !e.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, t, tag);
}
async function goto(page, path) { await page.goto(BASE + path, { waitUntil: "networkidle2" }); await sleep(700); }
// Wait until the (lowercased) body contains a string — for client-data pages
// that do several sequential latency'd api calls before rendering.
async function waitText(page, s, timeout = 10000) {
  try { await page.waitForFunction((s) => document.body.innerText.toLowerCase().includes(s), { timeout }, s.toLowerCase()); return true; }
  catch { return false; }
}
// Lowercased innerText of the <nav> only (for asserting nav scoping precisely).
const navText = (page) => page.evaluate(() => document.querySelector("nav")?.innerText.toLowerCase() ?? "");
// Click a button/link inside the currently-open [role=menu] by text.
async function clickMenuItem(page, text) {
  return page.evaluate((text) => {
    const menu = document.querySelector('[role="menu"]');
    const el = menu && [...menu.querySelectorAll("button, a")].find((e) => e.textContent.includes(text));
    if (el) { el.click(); return true; }
    return false;
  }, text);
}
// Find a regulatory anchor by its text; returns {href,target,rel} or null.
async function regLink(page, matchText) {
  return page.evaluate((matchText) => {
    const a = [...document.querySelectorAll("a")].find((e) => new RegExp(matchText, "i").test(e.textContent) && /clearpath-medtech/.test(e.href));
    return a ? { href: a.href, target: a.target, rel: a.rel } : null;
  }, matchText);
}
const regOk = (r) => !!r && r.href.includes("clearpath-medtech.vercel.app") && r.target === "_blank" && /noopener/.test(r.rel);
// Site restructure: the PUBLIC header (Home · About · Framework + Login) shows
// until a persona is picked. Any assertion about the PRODUCT nav therefore has
// to set the signed-in flag as well as the role — setting the role alone now
// leaves you on the public header.
const signInAs = (page, role) =>
  page.evaluate((role) => {
    localStorage.setItem("clearpath-role", role);
    localStorage.setItem("clearpath-signed-in", "true");
  }, role);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => { localStorage.clear(); });

  console.log("\n── PUBLIC header: Home · About · Framework + Login ──");
  await goto(page, "/");
  let nav = await navText(page);
  // "research" is in the exclusion list on purpose: /research ships reachable
  // from home §4 and /framework, but the approved public IA stays three items.
  ok("public nav = Home / About / Framework only", nav.includes("home") && nav.includes("about") && nav.includes("framework") && !nav.includes("inbox") && !nav.includes("registry") && !nav.includes("site readiness") && !nav.includes("my applications") && !nav.includes("research"));
  ok("Login button (not the product 'Login as')", (await body(page)).includes("login"));
  ok("/about resolves (not a 404)", (await page.evaluate(async () => (await fetch("/about")).status)) === 200);

  console.log("\n── HOME landing: hero, entry cards, marketplace band, how-it-works, trust ──");
  let t = await body(page);
  ok("hero headline", t.includes("discover, deployment and evaluation platform for digital and ai solutions for hospitals"));
  ok("hero sub-paragraph", t.includes("more ai tools than it can safely evaluate and deploy") && t.includes("without pilot hell"));
  ok("brand ClearPath (no Slingshot)", t.includes("clearpath") && !t.includes("slingshot"));
  // §2.1 deleted the pilot-death band outright. Assert it STAYS deleted.
  ok("pilot-death band removed", !t.includes("pilots stall and die") && !t.includes("no one owns the tool"));
  ok("three entry cards present", t.includes("for hospitals") && t.includes("for innovators") && t.includes("the marketplace") && t.includes("discover, evaluate and deploy tools safely") && t.includes("get your product evaluated"));
  ok("marketplace supporting lines (§2.3)", t.includes("get connected to hospitals and innovators based on your need") && t.includes("a public directory of clinically assessed tools and digitally ready hospitals"));
  ok("how it works (assess/place/run/prove)", t.includes("assess") && t.includes("place") && t.includes("run") && t.includes("prove"));
  ok("trust line (CDSCO/DPDP/ABDM-aware)", t.includes("abdm-aware") && t.includes("calibrated language"));
  // §4 on-ramp: the link text is now "Start there", not "regulatory journey".
  const homeReg = await regLink(page, "start there");
  ok("home regulatory on-ramp → clearpath-medtech, new tab", regOk(homeReg), homeReg ? homeReg.href : "MISSING");
  // Entry cards replace the old three doors: two anchor into this page, the
  // marketplace card routes to the directory. All three must be real links.
  const cards = await page.evaluate(() => ({
    hospitals: !!document.querySelector('a[href="#for-hospitals"]'),
    innovators: !!document.querySelector('a[href="#for-innovators"]'),
    marketplace: !!document.querySelector('a[href="/registry"]'),
    targets: !!document.querySelector("#for-hospitals") && !!document.querySelector("#for-innovators"),
  }));
  ok("entry card → For hospitals anchors into §3", cards.hospitals);
  ok("entry card → For innovators anchors into §4", cards.innovators);
  ok("entry card → The marketplace routes to the directory", cards.marketplace);
  ok("both in-page anchor targets exist", cards.targets);

  console.log("\n── §3 hospital accordion: collapsed by default, one open at a time ──");
  ok("§3 heading", t.includes("stop running pilots that go nowhere"));
  ok("four item headers visible", t.includes("discover and compare") && t.includes("check your site readiness") && t.includes("deploy and test") && t.includes("audit trail and scorecard"));
  ok("collapsed by default (no panel copy showing)", !t.includes("via india's first vendor-neutral ai marketplace"));
  // Each of the four demos wires a REAL product component to the mock api, so
  // every box arrives after simulated latency — waitText each one, never sleep
  // and hope. The assertions pair the frame's caption with content only that
  // component renders, so swapping in a mock would fail the check.
  await clickText(page, "Discover and compare");
  await sleep(300);
  t = await body(page);
  ok("expands on click", t.includes("via india's first vendor-neutral ai marketplace"));
  // §3.1 — DirectoryDemo → the real <RegistryTable>. "cdsco class" is a column
  // header that appears nowhere else on home, so it can only come from the table.
  const demo1 = await waitText(page, "cdsco class");
  t = await body(page);
  ok("§3.1 demo renders the real registry table", demo1 && t.includes("marketplace directory · assessed tools") && t.includes("cdsco class"));

  // §3.2 — SiteReadinessDemo → the real <SiteReadinessPanel>, read-only, seeded
  // from the Northvale fixture. All six domain labels must be present: the box
  // is captioned "six domains" and has to actually show six.
  await clickText(page, "Check your site readiness");
  await sleep(400);
  t = await body(page);
  ok("one open at a time (first item closed)", !t.includes("via india's first vendor-neutral ai marketplace"));
  const demo2 = await waitText(page, "governance & ethics");
  t = await body(page);
  ok("§3.2 demo renders the real site-readiness panel (all six domains)", demo2 && t.includes("site readiness · six domains") && t.includes("site grade") && t.includes("governance & ethics") && t.includes("people & training") && t.includes("infrastructure & it") && t.includes("data & documentation") && t.includes("regulatory & quality") && t.includes("patient access"));

  // §3.3 — MonitoringDemo → the real monitoring dashboard.
  await clickText(page, "Deploy and test");
  await sleep(400);
  const demoUp = await waitText(page, "drift — data & prediction");
  t = await body(page);
  ok("§3.3 demo renders the real monitoring dashboard", demoUp && t.includes("monitoring · governance dashboard") && t.includes("performance by subgroup"));

  // §3.4 — AssessDemo → the real <ApplicationList>, grouped by category. The
  // fixture spans several categories, so "screening" proves the grouping renders
  // rather than a single ungrouped row.
  await clickText(page, "Audit trail and scorecard");
  await sleep(400);
  // Wait on CONTENT, never on the frame's caption: ProductPreview renders its
  // label immediately while the spinner is still up, so waiting on the label
  // returns before the data lands. This demo is the slowest of the four — it
  // resolves a tool + readiness card per submission — hence the longer timeout.
  const demo4 = await waitText(page, "cerviai", 20000);
  t = await body(page);
  ok("§3.4 demo renders the real application list", demo4 && t.includes("assess tool applications · verdicts") && t.includes("screening") && t.includes("cerviai"));

  console.log("\n── /hospitals landing (reachable by URL; no longer linked from home) ──");
  await goto(page, "/hospitals");
  t = await body(page);
  ok("hospitals headline", t.includes("stop running pilots that go nowhere"));
  ok("hospitals 3 value props", t.includes("your own verdict") && t.includes("placement & readiness") && t.includes("run it properly"));
  ok("primary CTA inbox + secondary site readiness", t.includes("open your inbox") && t.includes("check our site readiness"));

  console.log("\n── /vendors landing + regulatory on-ramp value prop ──");
  await goto(page, "/vendors");
  t = await body(page);
  ok("vendors headline", t.includes("from readiness card to a hospital"));
  ok("vendors 3 value props", t.includes("calibrated readiness card") && t.includes("best-fit hospital") && t.includes("regulatory on-ramp"));
  ok("submit CTA", t.includes("submit a tool"));
  const reg = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) => /regulatory on-ramp/i.test(e.textContent) && e.target === "_blank");
    return a ? { href: a.href, target: a.target, rel: a.rel } : null;
  });
  ok("vendors regulatory value prop → clearpath-medtech, new tab", !!reg && reg.href.includes("clearpath-medtech.vercel.app") && reg.target === "_blank" && /noopener/.test(reg.rel), reg ? reg.href : "none");

  console.log("\n── Clean URLs + redirect ──");
  await goto(page, "/registry/cerviai");
  await waitText(page, "assessment across four dimensions");
  ok("clean URL /registry/cerviai works", (await body(page)).includes("assessment across four dimensions"));
  // Legacy deployment-id → clean tool-slug redirect is a HOSPITAL workspace behavior.
  await page.evaluate(() => localStorage.setItem("clearpath-role", "hospital"));
  await page.goto(BASE + "/workspace/deploy-cerviai", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/workspace/cerviai", { timeout: 8000 }).catch(() => {});
  ok("legacy /workspace/deploy-cerviai redirects to /workspace/cerviai", (await page.evaluate(() => location.pathname)) === "/workspace/cerviai");

  await page.evaluate(() => localStorage.setItem("clearpath-role", "hospital"));

  console.log("\n── Inbox: categories, status column, hospital-only actions ──");
  await goto(page, "/hospital");
  t = await body(page);
  ok("grouped by category (Screening header)", t.includes("screening"));
  ok("dedicated status column + badges (New / Pilot ongoing)", t.includes("status") && t.includes("new") && t.includes("pilot ongoing"));
  ok("actions: Assess / Skip / Re-run", t.includes("assess") && t.includes("skip") && t.includes("re-run audit"));
  ok("no per-row site-readiness button", !t.includes("site-readiness"));
  ok("no hospital strip (single-hospital inbox)", !t.includes("rural chc") && !t.includes("site b"));
  ok("NO vendor workflows in hospital inbox", !t.includes("submit a tool") && !t.includes("list my solution"));

  console.log("\n── Approve updates status everywhere (the propagation bug) ──");
  await clickText(page, "Assess");
  await page.waitForSelector("textarea", { timeout: 10000 });
  await sleep(600);
  const saved = await clickText(page, "Save audit");
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("evaluated"), { timeout: 8000 }).catch(() => {});
  await page.type("textarea", "Approved for a supervised trial.");
  await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Approve"); return b && !b.disabled; }, { timeout: 8000 });
  const approved = await clickText(page, "Approve");
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("deployment has been created"), { timeout: 8000 }).catch(() => {});
  t = await body(page);
  ok("save + approve fired", saved && approved);
  ok("audit page status updates to Approved (no stale re-render)", t.includes("deployment has been created") && t.includes("approved"));
  await goto(page, "/hospital");
  t = await body(page);
  ok("inbox row now shows Approved status badge", t.includes("approved"));

  console.log("\n── CerviAI trial + CTRI; ChestXR completed deployment ──");
  await goto(page, "/workspace/cerviai");
  await waitText(page, "clinical trial workspace");
  t = await body(page);
  ok("CerviAI is a clinical trial workspace", t.includes("clinical trial workspace"));
  await clickText(page, "Ethics & CTRI setup");
  await sleep(900);
  t = await body(page);
  ok("CTRI registration step present in the trial", t.includes("ctri registration"));
  ok("prospective-registration compliance flag shown", t.includes("prospective"));
  ok("auto-drafted dataset + AI-suggested codes", t.includes("auto-drafted dataset") && t.includes("ai-suggested"));
  ok("Mode B — per-trial site readiness inside the workflow", t.includes("site readiness to host this trial"));
  // Deployment workspace does NOT show CTRI.
  await goto(page, "/workspace/chestxr");
  await waitText(page, "deployment workspace");
  t = await body(page);
  ok("ChestXR is a deployment workspace (no CTRI)", t.includes("deployment workspace") && !t.includes("ctri registration"));

  console.log("\n── CerviAI docs: one source of truth, no old/duplicates ──");
  await goto(page, "/hospital/cerviai");
  await waitText(page, "attached evidence");
  const raw = await page.evaluate(() => document.body.innerText);
  const dup = (raw.match(/Independent validation study/g) || []).length;
  ok("CerviAI shows exactly one validation doc (no dupes)", dup === 1, `count=${dup}`);
  ok("shows the attached docs", raw.includes("CDSCO MD-15 licence") && raw.includes("DPDP privacy policy") && raw.includes("Ethics approval"));
  ok("no stale/old doc names", !raw.includes("cerviai-cdsco-cert") && !raw.includes("clinical-eval-report.pdf"));

  console.log("\n── Registry: status column, one class, View details, numbers ──");
  await goto(page, "/registry");
  t = await body(page);
  ok("CDSCO class column with single class (Class C)", t.includes("cdsco class") && t.includes("class c"));
  ok("status column (Ongoing / Completed)", t.includes("ongoing") && t.includes("completed"));
  ok("View details action (not a dropdown)", t.includes("view details"));
  ok("both categories populated (trials + deployments)", t.includes("clinical trials") && t.includes("deployments"));
  ok("sample numbers present", /412 \/ 1,000|620 \/ 1,200|300 \/ 300/.test(t));
  await clickText(page, "View details");
  await page.waitForFunction(() => location.pathname.startsWith("/registry/"), { timeout: 8000 }).catch(() => {});
  await waitText(page, "assessment across four dimensions");
  t = await body(page);
  ok("View details opens the full card", t.includes("assessment across four dimensions"));

  console.log("\n── Mode A: general site-readiness with host-profile selector ──");
  await goto(page, "/site-readiness");
  t = await body(page);
  ok("Mode A self-assessment present", t.includes("check our site readiness") && t.includes("onboarding work order"));
  ok("host-profile selector parameterizes (trial / deployment / SaMD)", t.includes("what do you want to host") && t.includes("clinical trial") && t.includes("deployment") && t.includes("samd"));

  // ── NEW · Committee, monitoring charts, real PDF, BODH ────────────────────
  console.log("\n── LIVE: add committee member reflects in roles ──");
  await goto(page, "/workspace/cerviai");
  await waitText(page, "clinical trial workspace");
  await clickText(page, "Enrolment");
  await page.waitForSelector('input[placeholder^="Name"]', { timeout: 8000 });
  await page.type('input[placeholder^="Name"]', "Dr. Test Member");
  await page.type('input[placeholder^="Role"]', "Data safety monitor");
  await clickText(page, "Add");
  await page.waitForFunction(() => document.body.innerText.includes("Dr. Test Member"), { timeout: 6000 }).catch(() => {});
  const raw2 = await page.evaluate(() => document.body.innerText);
  ok("new committee member appears in roles list", raw2.includes("Dr. Test Member") && raw2.includes("Data safety monitor"));

  console.log("\n── MONITORING: interactive governance charts ──");
  await clickText(page, "Monitoring");
  await sleep(1200);
  t = await body(page);
  const svgs = await page.evaluate(() => document.querySelectorAll("svg.recharts-surface").length);
  ok("interactive charts render (recharts SVGs)", svgs >= 3, `svgs=${svgs}`);
  ok("performance / drift / subgroup / alerts panels", t.includes("performance over time") && t.includes("drift") && t.includes("subgroup") && t.includes("alerts feed"));

  console.log("\n── REPORT: Generate report downloads a real PDF ──");
  const DL = "/tmp/slingshot-dl";
  try { rmSync(DL, { recursive: true, force: true }); } catch {}
  mkdirSync(DL, { recursive: true });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
  await goto(page, "/workspace/chestxr");
  await waitText(page, "deployment workspace");
  await clickText(page, "Download report (PDF)");
  let pdfName = null;
  for (let i = 0; i < 20 && !pdfName; i++) { await sleep(300); pdfName = readdirSync(DL).find((f) => f.endsWith(".pdf")); }
  ok("a real PDF file downloaded", !!pdfName, pdfName || "none");

  console.log("\n── BODH: score on card + pre-fills fairness gate ──");
  await goto(page, "/hospital/cerviai");
  await waitText(page, "bodh validation score");
  t = await body(page);
  ok("BODH validation score shows on the card", t.includes("bodh validation score") && t.includes("accuracy"));
  // Wizard pre-fill (vendor role): fresh tool, no answers → pre-fill sets 3 gates.
  await page.evaluate(() => localStorage.setItem("clearpath-role", "vendor"));
  await goto(page, "/submit");
  await clickText(page, "Begin");
  await page.waitForSelector('input[placeholder^="e.g. CerviAI"]', { timeout: 8000 });
  await page.type('input[placeholder^="e.g. CerviAI"]', "BodhTool");
  await page.type('input[placeholder^="e.g. CerviAI Health"]', "Bodh Co");
  await clickText(page, "Continue");        // → Reports
  await sleep(700);
  await clickText(page, "Continue");        // → Questions
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("bodh validation score"), { timeout: 8000 });
  await clickText(page, "Pre-fill clinical + fairness gates");
  await page.waitForFunction(() => document.body.innerText.includes("3/17 answered"), { timeout: 6000 }).catch(() => {});
  t = await body(page);
  ok("BODH pre-fills clinical + fairness gates (3/17 answered)", t.includes("3/17 answered"));

  console.log("\n── ROLE SCOPE: vendor light dashboard vs hospital full workspace ──");
  await page.evaluate(() => localStorage.setItem("clearpath-role", "vendor"));
  await goto(page, "/workspace/cerviai");
  await waitText(page, "deployment status");
  t = await body(page);
  const vsvgs = await page.evaluate(() => document.querySelectorAll("svg.recharts-surface").length);
  ok("vendor: read-only light status dashboard (timeline + numbers)", t.includes("deployment status") && t.includes("enrolment") && t.includes("open alerts"));
  ok("vendor: NO monitoring/drift charts or workspace controls", vsvgs === 0 && !t.includes("governance dashboard") && !t.includes("drift"));
  await page.evaluate(() => localStorage.setItem("clearpath-role", "hospital"));
  await goto(page, "/workspace/cerviai");
  await waitText(page, "clinical trial workspace");
  t = await body(page);
  ok("hospital: full workspace (stepper + monitoring reachable)", t.includes("clinical trial workspace") && t.includes("monitoring"));

  console.log("\n── PAYOFF phases populated (Analysis / Review) ──");
  await clickText(page, "Analysis");
  await sleep(900);
  t = await body(page);
  ok("trial Analysis shows study endpoints (populated, not empty)", t.includes("sensitivity") && t.includes("referral") && (t.includes("met") || t.includes("missed")));
  await goto(page, "/workspace/chestxr");
  await waitText(page, "deployment workspace");
  await clickText(page, "Review");
  await sleep(900);
  t = await body(page);
  ok("deployment Review shows operational scorecard", t.includes("clinical") && t.includes("workflow") && t.includes("referral"));

  console.log("\n── 17 gates everywhere (no stray 16) ──");
  await goto(page, "/");
  t = await body(page);
  ok("home: 17 gates, no 16 gates", t.includes("17 gates") && !t.includes("16 gate"));
  await goto(page, "/vendors");
  t = await body(page);
  ok("vendors: 17 gates", t.includes("17 gates") && !t.includes("16 gate"));
  await goto(page, "/registry/cerviai");
  await waitText(page, "gates clear");
  t = await body(page);
  ok("card chip: 17 gates clear, no 16", t.includes("gates clear") && t.includes("17") && !t.includes("16 gate") && !t.includes("/ 16"));

  console.log("\n── HOSPITAL PERSONAS: switching swaps inbox + readiness coherently ──");
  await page.evaluate(() => { localStorage.setItem("clearpath-role", "hospital"); localStorage.setItem("clearpath-hospital", "hosp-northvale"); });
  await goto(page, "/hospital");
  await waitText(page, "cerviai"); // wait for the inbox rows to finish loading
  t = await body(page);
  ok("persona switcher shows current hospital (Northvale Institute of Medical Sciences)", t.includes("northvale institute of medical sciences"));
  ok("Northvale: full multi-workflow inbox (trial + deployment tools)", t.includes("cerviai") && t.includes("chestxr") && t.includes("retinascan") && t.includes("symptombot"));

  // Switch persona via the dropdown, IN PLACE (no reload) → inbox must swap.
  await clickText(page, "Northvale Institute of Medical Sciences"); // open the switcher
  await sleep(300);
  await clickText(page, "Site B"); // pick the aspiring site
  await sleep(1300);
  t = await body(page);
  ok("Site B: switching swaps to an empty inbox (aspiring site)", t.includes("isn't assessing tools yet"));
  ok("Site B: inbox no longer shows Northvale's tools (coherent swap)", !t.includes("cerviai") && !t.includes("symptombot"));

  // Site B site-readiness → NOT ready + gaps + submit to registry.
  await goto(page, "/site-readiness");
  await waitText(page, "check our site readiness");
  t = await body(page);
  ok("Site B readiness: NOT ready + onboarding work order", t.includes("not ready") && t.includes("onboarding work order"));
  const submitted = await clickText(page, "Submit readiness to the registry");
  await sleep(1300);
  t = await body(page);
  ok("Site B: submit-to-registry confirms a listing", submitted && t.includes("listed on the registry"));

  // Registry reflects all three (Northvale tools + Lakeview trial + Site B site).
  await goto(page, "/registry");
  await waitText(page, "sites on the network");
  t = await body(page);
  ok("registry: Site B listed as a developing site", t.includes("sites on the network") && t.includes("site b") && t.includes("developing"));
  ok("registry reflects all three (Northvale's tools + Lakeview's trial)", t.includes("cerviai") && t.includes("ovareserve") && t.includes("lakeview"));

  // Lakeview (fertility centre) — specialty-scoped inbox + readiness.
  await page.evaluate(() => localStorage.setItem("clearpath-hospital", "hosp-lakeview"));
  await goto(page, "/hospital");
  await waitText(page, "embryograde"); // wait for Lakeview's inbox rows to load
  t = await body(page);
  ok("Lakeview: specialty-scoped inbox header (fertility)", t.includes("specialty-scoped") && t.includes("fertility"));
  ok("Lakeview: only specialty tools (EmbryoGrade / OvaReserve)", t.includes("embryograde") && t.includes("ovareserve"));
  ok("Lakeview: NOT general screening tools (scoping holds)", !t.includes("cerviai") && !t.includes("symptombot"));
  await goto(page, "/site-readiness");
  await waitText(page, "check our site readiness");
  t = await body(page);
  ok("Lakeview: trial-ready + specialty-scoped readiness", t.includes("trial-ready") && t.includes("scoped to fertility"));

  console.log("\n── VENDOR: My applications (mirror of the inbox → status dashboard) ──");
  await page.evaluate(() => localStorage.setItem("clearpath-role", "vendor"));
  await goto(page, "/applications");
  await waitText(page, "my applications");
  await waitText(page, "cerviai"); // rows loaded
  t = await body(page);
  ok("'My applications' in the vendor nav (peer to Submit a tool)", t.includes("submit a tool") && t.includes("my applications") && t.includes("registry"));
  ok("lists tool-hospital rows with stage + numbers (CerviAI @ Northvale, day 34/90)", t.includes("cerviai") && t.includes("northvale institute of medical sciences") && t.includes("day 34 of 90"));
  ok("shows request type + a completed deployment (ChestXR-TB)", t.includes("chestxr-tb") && t.includes("deployment request") && t.includes("trial request"));
  ok("includes other seeded pairings (Lakeview fertility trials)", t.includes("ovareserve") && t.includes("lakeview"));

  const clickedRow = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) => e.getAttribute("href") === "/workspace/cerviai");
    if (a) { a.click(); return true; }
    return false;
  });
  await page.waitForFunction(() => location.pathname === "/workspace/cerviai", { timeout: 8000 }).catch(() => {});
  await waitText(page, "deployment status");
  t = await body(page);
  const appSvgs = await page.evaluate(() => document.querySelectorAll("svg.recharts-surface").length);
  ok("clicking a row opens the read-only status dashboard", clickedRow && t.includes("deployment status") && t.includes("enrolment"));
  ok("that dashboard is read-only (no monitoring/drift charts)", appSvgs === 0 && !t.includes("governance dashboard") && !t.includes("drift"));

  console.log("\n── LOGIN AS selector re-scopes nav instantly (no reload) ──");
  await signInAs(page, "hospital");
  await goto(page, "/");
  nav = await navText(page);
  ok("hospital nav = Home / Inbox / Site readiness / Registry", nav.includes("inbox") && nav.includes("site readiness") && nav.includes("registry") && !nav.includes("my applications") && !nav.includes("submit a tool") && !nav.includes("explore regulatory"));
  // Flip to Vendor via the dropdown — instant, no navigation.
  await clickText(page, "Login as");
  await sleep(250);
  await clickMenuItem(page, "Get your tool evaluated"); // Vendor / startup
  await sleep(600);
  nav = await navText(page);
  ok("Login as → Vendor instantly re-scopes nav", nav.includes("my applications") && nav.includes("submit a tool") && nav.includes("explore regulatory") && nav.includes("registry") && !nav.includes("inbox") && !nav.includes("site readiness"));
  ok("vendor nav order: My applications before Submit a tool", nav.indexOf("my applications") < nav.indexOf("submit a tool"));
  // Flip back to Hospital — instant.
  await clickText(page, "Login as");
  await sleep(250);
  await clickMenuItem(page, "Evaluate, place & run clinical AI"); // Hospital
  await sleep(600);
  nav = await navText(page);
  ok("Login as → Hospital instantly re-scopes nav back", nav.includes("inbox") && nav.includes("site readiness") && !nav.includes("my applications"));
  ok("hospital persona switcher still present under Hospital", (await body(page)).includes("viewing as"));

  console.log("\n── REGULATORY redirect guard (every intended spot → clearpath-medtech, new tab) ──");
  await signInAs(page, "vendor");
  await goto(page, "/");
  const rHome = await regLink(page, "start there");
  ok("home §4 regulatory link", regOk(rHome), rHome ? rHome.href : "MISSING");
  const rNav = await regLink(page, "explore regulatory");
  ok("vendor nav 'Explore regulatory' link", regOk(rNav), rNav ? rNav.href : "MISSING");
  await clickText(page, "Login as");
  await sleep(250);
  const rMenu = await regLink(page, "regulatory filing");
  ok("Login-as dropdown 'Regulatory filing' link", regOk(rMenu), rMenu ? rMenu.href : "MISSING");
  await clickText(page, "Login as"); // close menu
  await goto(page, "/vendors");
  await waitText(page, "regulatory on-ramp");
  const rCard = await regLink(page, "regulatory on-ramp");
  ok("vendor on-ramp card link", regOk(rCard), rCard ? rCard.href : "MISSING");
  // Hospital nav must NOT carry a regulatory item (redirect is vendor-only + home + dropdown).
  await signInAs(page, "hospital");
  await goto(page, "/");
  nav = await navText(page);
  ok("no regulatory nav item for hospital", !nav.includes("regulatory"));

  console.log("\n── FRAMEWORK (methodology) page + home link ──");
  // Home links to the framework (in the how-it-works section), home stays simple.
  await signInAs(page, "vendor");
  await goto(page, "/");
  const fwLink = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) => /see the full framework/i.test(e.textContent));
    return a ? a.getAttribute("href") : null;
  });
  ok("home 'See the full framework' link → /framework", fwLink === "/framework", fwLink ?? "MISSING");
  ok("home stays simple (no full cluster list on home)", !(await body(page)).includes("clinical performance & safety"));
  ok("Framework in the nav", (await navText(page)).includes("framework"));

  await goto(page, "/framework");
  await waitText(page, "pre-deployment maturity framework");
  t = await body(page);
  ok("intro: practitioner-led standard + EdTech Tulna model", t.includes("practitioner-led") && t.includes("edtech tulna"));
  ok("4 dimensions with names + weights (31/14/33/34)", t.includes("clinical, scientific & regulatory quality") && t.includes("system fit") && t.includes("user experience & workflow fit") && t.includes("technology, data governance & usability") && t.includes("31") && t.includes("14") && t.includes("33") && t.includes("34"));
  ok("totals: 4 dimensions · 17 clusters · 112 items", t.includes("17 clusters") && t.includes("112") && t.includes("assessment items"));
  // Spot-check clusters across all four dimensions + a distinctive item count.
  ok("clusters present (D1.C Clinical Performance & Safety, D4.F Data Privacy…)", t.includes("d1.c") && t.includes("clinical performance & safety") && t.includes("d4.f") && t.includes("data privacy, storage & security") && t.includes("14 items"));
  ok("maturity ladder 0–3 (absent → system-owned, gate-blocking)", t.includes("absent / fails") && t.includes("works via a workaround") && t.includes("adequate with support") && t.includes("system-owned") && t.includes("deployment-blocking"));
  ok("weighting note: workflow + data weigh as much as evidence", t.includes("outweigh") && t.includes("necessary") && t.includes("not sufficient"));
  ok("sample report: 'Conditionally deployable' + dimension averages (illustrative)", t.includes("conditionally deployable") && t.includes("scaffolded programme") && t.includes("illustrative") && t.includes("2.4") && t.includes("1.6"));
  ok("openness line: open, 3 tools / 8 districts / 75,000+", t.includes("open and practitioner-led") && t.includes("8 districts") && t.includes("75,000"));
  ok("D2 buyer-conditional split (public procurement vs private investment case)", t.includes("buyer-conditional") && t.includes("state / government procurement") && t.includes("private-hospital investment-case") && t.includes("roi / payback") && t.includes("liability & indemnity"));

  console.log("\n── RESEARCH (regulatory benchmark) page + entry points ──");
  // Sign OUT first: /research is a public marketing page, and the header it
  // wears signed-out is the actual regression risk (a public page is only
  // "public" to the shell if isPublicRoute knows about it).
  await page.evaluate(() => localStorage.clear());
  // Reachable from home §4 and /framework, never from the public nav.
  await goto(page, "/");
  const rsLink = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) => /how we built the regulatory tool/i.test(e.textContent));
    return a ? a.getAttribute("href") : null;
  });
  ok("home §4 'How we built the regulatory tool' → /research", rsLink === "/research", rsLink ?? "MISSING");
  const fwToResearch = await page.evaluate(async () => {
    const r = await fetch("/framework");
    const html = await r.text();
    return /href="\/research"/.test(html);
  });
  ok("/framework cross-links to /research", fwToResearch);

  await goto(page, "/research");
  ok("/research resolves (not a 404)", (await page.evaluate(async () => (await fetch("/research")).status)) === 200);
  await waitText(page, "ceiling of 0.523");
  t = await body(page);
  ok("hero: eyebrow + the 'fails in the direction that matters' headline", t.includes("research") && t.includes("classify a medical device") && t.includes("fails in the direction that matters"));
  ok("§question: six models, name + intended use, 2,395 devices [C1]", t.includes("six models") && t.includes("intended use") && t.includes("2,395 devices"));

  // Every figure below must trace to a claim in research/paper/results_claims.md.
  ok("§result: 0.523 ceiling + 0.354–0.523 range [C1]", t.includes("0.523") && t.includes("0.354"));
  // C1 REQUIRES accuracy + weighted-F1 alongside macro-F1, and the class weighting.
  ok("§result: accuracy + weighted-F1 reported alongside, with weighting stated [C1]", t.includes("54.5% accuracy") && t.includes("weighted-f1 of 0.545") && t.includes("6.8%") && t.includes("42.5%"));
  ok("§result: panel majority is WORSE (0.490) + 288 unresolved ties [C2]", t.includes("0.490") && t.includes("288 of the 2,395") && t.includes("worse"));
  // The callout — the only thing on the page allowed to compete with 0.523.
  ok("callout: 58 devices, ≥4 of 6 agreeing on Class C, none reaching D [C6]", t.includes("58 devices") && t.includes("four of the six models") && t.includes("not one of those 58"));
  ok("gradient: 0.0 / 9.3 / 29.3 / 50.5 by true class [C3]", t.includes("0.0") && t.includes("9.3") && t.includes("29.3") && t.includes("50.5"));
  // C3 MANDATES the structural caveat — without it the 0.0% reads as a finding.
  ok("gradient: states Class A 0.0% is STRUCTURAL, not a result [C3]", t.includes("cannot be under-classified by construction") && t.includes("structural"));
  ok("all 494 Class-D errors are under-classifications [C5]", t.includes("494"));
  // C4 forbids presenting the same event three ways — assert the one form used.
  ok("40 of 163 Class-D devices get no Class-D vote [C4]", t.includes("40 of the 163"));
  ok("C is the attractor: 2,132 of 6,102 true-B decisions → C, 34.9% [C7]", t.includes("2,132 of 6,102") && t.includes("34.9%"));
  ok("bias not variance: 92.2% self-consistency against a 0.523 ceiling [C8]", t.includes("92.2%"));
  ok("§design brief: the three principles", t.includes("never sound more certain than the regulator") && t.includes("decompose before classifying") && t.includes("keep a human in the expensive part"));
  ok("§scope: nine bodies + CDSCO pilot + not regulatory advice", t.includes("nine regulatory bodies") && t.includes("cdsco is the pilot regulator") && t.includes("not regulatory advice"));
  ok("§limits: internal benchmark, oracle ≠ ground truth", t.includes("internal benchmark, not a peer-reviewed finding") && t.includes("not as adjudicated ground truth"));

  // Register guardrails — these must STAY false. Each maps to a rule in the
  // claims register's "Claims explicitly forbidden" table or its calibration notes.
  ok("models are NOT named (META-1: aliases mutable, comparison not defensible)", !t.includes("gpt-4o") && !t.includes("gemini") && !t.includes("claude") && !t.includes("qwen") && !t.includes("llama") && !t.includes("deepseek"));
  ok("no majority-class-baseline claim (cut: unregistered AND false)", !t.includes("barely above") && !t.includes("guessed the same class"));
  ok("no A→B claim (cut: real in the CSV, absent from the register)", !t.includes("class a devices get pushed up"));
  ok("'life-supporting' removed from every Class D reference", !t.includes("life-supporting"));
  ok("no forbidden phrasings (held-out / breaks 31% / 35% flip)", !t.includes("held-out") && !t.includes("breaks 31%") && !t.includes("35% of"));
  ok("no claim any REAL device is misclassified (oracle framing held)", t.includes("reference list places") && !t.includes("devices are misclassified"));

  const rsReg = await regLink(page, "try the regulatory tool");
  ok("research → regulatory tool, new tab", regOk(rsReg), rsReg ? rsReg.href : "MISSING");
  const rsFw = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) => /see the deployment framework/i.test(e.textContent));
    return a ? a.getAttribute("href") : null;
  });
  ok("research cross-links back to /framework", rsFw === "/framework", rsFw ?? "MISSING");
  // /research must wear the PUBLIC header (Home · About · Framework + Login) —
  // and must NOT add itself as a fourth nav item. Both halves matter: the first
  // catches isPublicRoute forgetting the route, the second catches the IA drift.
  const rsNav = await navText(page);
  ok("/research wears the PUBLIC header, signed out", rsNav.includes("home") && rsNav.includes("about") && rsNav.includes("framework") && !rsNav.includes("inbox") && !rsNav.includes("registry") && !rsNav.includes("my applications"));
  ok("Research still NOT in the nav while ON /research", !rsNav.includes("research"));

  console.log(`\n${failures === 0 ? "BROWSER VERIFY PASSED" : `${failures} CHECK(S) FAILED`}`);
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  await browser.close();
}
process.exit(failures === 0 ? 0 : 1);
