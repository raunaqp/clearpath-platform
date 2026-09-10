/**
 * ONE RUNNER for every verification suite.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────
 * There was a suite per phase and a growing habit of adding an npm script with
 * each one. Two problems, and the second is the one that bites:
 *
 *   1. Eight scripts by Phase 5, and no single command that runs them.
 *   2. Running the browser suites together crashed with "Navigating frame was
 *      detached" — three Chrome instances competing for one dev server, each
 *      suite discovering the server independently and none of them yielding.
 *
 * So: engine suites first (fast, no browser, failures surface before Chrome
 * ever starts), the dev server checked ONCE, then browser suites strictly one
 * at a time with a settle gap between them.
 *
 * ADDING A PHASE ADDS A ROW TO `SUITES`, not another npm script.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REGRESSIONS VS DIVERGENCES
 * ─────────────────────────────────────────────────────────────────────────
 * Several suites end DIVERGED: a stated fixture target the engine provably
 * cannot produce, printed with its arithmetic rather than tuned until it
 * agrees. That is not the same event as something breaking, and collapsing the
 * two makes a permanently-red run that stops being read. They are counted and
 * reported separately — and a standing divergence still exits non-zero, so it
 * has to be resolved rather than lived with.
 *
 * Usage:
 *   npm run verify:all
 *   npm run verify:all -- engine     only the suites that need no browser
 *   npm run verify:all -- browser    only the browser suites
 *   npm run verify:all -- phase5     only suites whose key contains "phase5"
 */
import { spawn } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3000";
/**
 * After a browser suite, wait until the dev server is answering promptly again
 * rather than sleeping a guessed interval. A long suite leaves it mid-compile
 * and still serving; the next suite launching into that is what produced the
 * detached-frame crashes and the spurious timeouts. Same principle the suites
 * themselves use internally: wait on the condition.
 */
const SETTLE_FLOOR_MS = 1000;
const SETTLE_TIMEOUT_MS = 30000;
const SETTLE_TARGET_MS = 1200;

/** @type {{key:string,label:string,kind:"engine"|"browser",cmd:string[]}[]} */
const SUITES = [
  { key: "phase1", label: "Phase 1 · data model & engines", kind: "engine", cmd: ["tsx", "scripts/phase1-acceptance.ts"] },
  { key: "phase2", label: "Phase 2 · card & remediation", kind: "engine", cmd: ["tsx", "scripts/phase2-acceptance.ts"] },
  { key: "phase3", label: "Phase 3 · innovator front half", kind: "engine", cmd: ["tsx", "scripts/phase3-acceptance.ts"] },
  { key: "phase4", label: "Phase 4 · migration, listing, matching", kind: "engine", cmd: ["tsx", "scripts/phase4-acceptance.ts"] },
  { key: "phase5", label: "Phase 5 · ClearPath handoff", kind: "engine", cmd: ["tsx", "scripts/phase5-acceptance.ts"] },
  { key: "phase6a", label: "Phase 6a · hospital front half", kind: "engine", cmd: ["tsx", "scripts/phase6a-acceptance.ts"] },
  { key: "phase6b", label: "Phase 6b · hospital governance", kind: "engine", cmd: ["tsx", "scripts/phase6b-acceptance.ts"] },
  { key: "phase6c", label: "Phase 6c · human-in-the-loop return", kind: "engine", cmd: ["tsx", "scripts/phase6c-acceptance.ts"] },
  { key: "browser", label: "Site-wide browser suite", kind: "browser", cmd: ["node", "scripts/browser-verify.mjs"] },
  { key: "phase3-browser", label: "Phase 3 · fresh submission journey", kind: "browser", cmd: ["node", "scripts/phase3-browser.mjs"] },
  { key: "phase5-browser", label: "Phase 5 · handoff journey", kind: "browser", cmd: ["node", "scripts/phase5-browser.mjs"] },
];

const filter = process.argv[2];
const selected = SUITES.filter((s) => {
  if (!filter) return true;
  if (filter === "engine" || filter === "browser") return s.kind === filter;
  return s.key.includes(filter);
});

if (selected.length === 0) {
  console.error(`No suite matches "${filter}". Known: ${SUITES.map((s) => s.key).join(", ")}`);
  process.exit(1);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Checked ONCE, not per suite. */
async function devServerUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** How long the dev server takes to answer right now. Infinity if it does not. */
async function probeMs() {
  const t = Date.now();
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(10000) });
    return res.ok ? Date.now() - t : Infinity;
  } catch {
    return Infinity;
  }
}

/** Block until the server is responsive again, or give up and carry on. */
async function settle() {
  await wait(SETTLE_FLOOR_MS);
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if ((await probeMs()) < SETTLE_TARGET_MS) return;
    await wait(500);
  }
}

function run(suite) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("npx", suite.cmd, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => resolve({ suite, code, out, ms: Date.now() - started }));
  });
}

/**
 * Classify from the suite's own summary line. The suites already print PASSED /
 * DIVERGED / FAILED; the runner reads what they say rather than guessing from
 * an exit code that cannot tell a divergence from a break.
 */
function classify({ code, out }) {
  const line = out.split("\n").reverse().find((l) => /\b(PASSED|DIVERGED|FAILED)\b/.test(l)) ?? "";
  // Browser suites print no "N passed" summary, so fall back to counting the
  // ticks they emitted. A run reporting "0 checks" reads as a suite that did
  // nothing, which is exactly what a green browser suite is not.
  const counts = line.match(/(\d+)\s+passed/i);
  const ticks = (out.match(/^✓/gm) ?? []).length;
  const regressions = Number(line.match(/(\d+)\s+regressions?/i)?.[1] ?? (/(FAILED)/.test(line) ? 1 : 0));
  const divergences = Number(line.match(/(\d+)\s+documented divergences?/i)?.[1] ?? 0);
  let status = "FAILED";
  if (/\bPASSED\b/.test(line) && code === 0) status = "PASSED";
  else if (/\bDIVERGED\b/.test(line) && regressions === 0) status = "DIVERGED";
  else if (code === 0) status = "PASSED";
  return { status, line: line.trim(), passed: Number(counts?.[1] ?? ticks), regressions, divergences };
}

const PAD = Math.max(...selected.map((s) => s.label.length));
const TINT = { PASSED: "\x1b[32m", DIVERGED: "\x1b[33m", FAILED: "\x1b[31m", SKIPPED: "\x1b[90m" };
const RESET = "\x1b[0m";

const needsBrowser = selected.some((s) => s.kind === "browser");
let serverUp = true;
if (needsBrowser) {
  serverUp = await devServerUp();
  console.log(
    serverUp
      ? `dev server: up at ${BASE}`
      : `\x1b[31mdev server: NOT reachable at ${BASE}\x1b[0m — browser suites will be skipped.\n  Start it with:  npm run dev`
  );
}

console.log("");
const results = [];
// Engine suites first: they need no browser, so a broken engine surfaces before
// Chrome is ever launched.
for (const suite of [...selected].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "engine" ? -1 : 1))) {
  if (suite.kind === "browser" && !serverUp) {
    results.push({ suite, status: "SKIPPED", line: "dev server not reachable", passed: 0, regressions: 0, divergences: 0, ms: 0, out: "" });
    console.log(`${TINT.SKIPPED}⊘${RESET} ${suite.label.padEnd(PAD)}  skipped`);
    continue;
  }
  const res = await run(suite);
  const c = classify(res);
  results.push({ suite, ...c, ms: res.ms, out: res.out });
  const mark = c.status === "PASSED" ? "✓" : c.status === "DIVERGED" ? "⚠" : "✗";
  console.log(
    `${TINT[c.status]}${mark}${RESET} ${suite.label.padEnd(PAD)}  ${c.status.padEnd(9)} ${String(c.passed).padStart(3)} checks  ${(res.ms / 1000).toFixed(1)}s`
  );
  // One at a time. Concurrent Chrome against one dev server is what produced
  // the detached-frame crashes this runner exists to stop.
  if (suite.kind === "browser") await settle();
}

// ── failures in full ────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === "FAILED");
for (const r of failed) {
  console.log(`\n${"─".repeat(70)}\n${TINT.FAILED}${r.suite.label}${RESET}\n${"─".repeat(70)}`);
  const marks = r.out.split("\n").filter((l) => /^[✓✗]/.test(l));
  const failures = marks.filter((l) => /^✗/.test(l));
  // The last few ticks locate where a suite got to before it threw — a stack
  // trace alone does not say which assertion was next.
  if (marks.length) console.log(`  last steps:\n${marks.slice(-6).map((l) => `    ${l}`).join("\n")}`);
  if (failures.length) console.log(`  failures:\n${failures.slice(0, 25).map((l) => `    ${l}`).join("\n")}`);
  const debug = r.out.split("\n").filter((l) => /^DEBUG/.test(l) || /^\s{2,}\S/.test(l) && /DEBUG/.test(r.out));
  const dbg = r.out.split("\n");
  const firstDebug = dbg.findIndex((l) => /^DEBUG/.test(l));
  if (firstDebug >= 0) console.log(`  debug:\n${dbg.slice(firstDebug, firstDebug + 14).map((l) => `    ${l}`).join("\n")}`);
  void debug;
  const errs = r.out.split("\n").filter((l) => /Error|error TS|Timeout|at file:/.test(l)).slice(0, 6);
  if (errs.length) console.log(`  error:\n${errs.map((l) => `    ${l.trim()}`).join("\n")}`);
}

// ── divergences, kept visible ───────────────────────────────────────────
const diverged = results.filter((r) => r.status === "DIVERGED");
if (diverged.length > 0) {
  console.log(`\n${"─".repeat(70)}\nDOCUMENTED DIVERGENCES — stated targets the engine cannot produce\n${"─".repeat(70)}`);
  for (const r of diverged) {
    for (const l of r.out.split("\n").filter((l) => /^⚠/.test(l))) {
      console.log(`  ${r.suite.key.padEnd(15)} ${l.replace(/^⚠\s*/, "")}`);
    }
  }
  console.log(`\n  Run the suite named above for the arithmetic behind each.`);
}

// ── summary ─────────────────────────────────────────────────────────────
const totals = results.reduce(
  (a, r) => ({
    checks: a.checks + r.passed,
    regressions: a.regressions + r.regressions,
    divergences: a.divergences + r.divergences,
  }),
  { checks: 0, regressions: 0, divergences: 0 }
);
const skipped = results.filter((r) => r.status === "SKIPPED").length;

console.log(`\n${"═".repeat(70)}`);
console.log(
  `${results.filter((r) => r.status === "PASSED").length} passed · ${diverged.length} diverged · ${failed.length} failed` +
    (skipped ? ` · ${skipped} skipped` : "")
);
console.log(
  `${totals.checks} checks · ${totals.regressions} regressions · ${totals.divergences} documented divergences`
);
console.log("═".repeat(70));

// A regression, a hard failure, or a skipped suite is a red run. A standing
// divergence is too — it has to be resolved, not lived with — but it is
// reported as its own category so the two are never confused.
process.exit(failed.length > 0 || skipped > 0 || diverged.length > 0 ? 1 : 0);
