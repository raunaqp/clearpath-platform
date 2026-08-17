# clearpath-platform — Build Spec for Claude Code
### The full three-journey product, fully mocked (no API calls)

**How to use this file.** Paste it into Claude Code inside (or beside) the existing ClearPath repo. Build with the ClearPath stack and conventions — reuse the brand tokens, engine-module structure, Zod schemas, and the `softenCertainty` post-processor already defined in the clearpath skill. This spec defines *what* to build and the *mock data*; the ClearPath skill defines *how* to write it.

**Prime directive.** No network calls anywhere. No real backend. Everything runs off local fixtures through a single swappable mock data layer, with simulated latency so it feels live. It must look and behave like a real, polished product — not a slideshow. The seed data is designed so the three journeys tell one continuous story.

---

## 1. The product and the three journeys

clearpath-platform is a pre-deployment evaluation, placement, and deployment layer for clinical-AI and digital-health tools. One app, one role switcher, three connected journeys:

| Journey | Role | Purpose | Produces |
|---|---|---|---|
| **A · Submit** | Vendor / innovator | Describe the company, answer basic questions, attach reports → get a Readiness Card | A `ReadinessCard` + a marketplace `Submission` |
| **B · Review & audit** | Hospital | See submissions, view documents + gate grid, run the hospital's own intake audit, decide | An `AuditResult` + a pilot decision |
| **C · Deploy** | Hospital | Run the approved pilot end-to-end; hand over; publish result back | A `Deployment` record + registry entry |

**Continuity requirement.** A submission created in A must appear in B's inbox. A decision in B must create the deployment shown in C. C's published result must update the tool's registry record. This is the whole point — wire the shared mock store so state flows A → B → C → registry.

### Recommended structure
- **One Next.js/React app**, top-level role switcher in the header: `Viewing as: Vendor ▸ | Hospital ▸`. Switching role changes the available nav, not the data.
- **Routes:**
  - `/` — landing / role-aware home
  - `/submit` — Journey A wizard
  - `/submit/[id]/card` — generated Readiness Card
  - `/hospital` — Journey B inbox (submissions grid)
  - `/hospital/[id]` — submission detail: card + documents + gate grid + "Run our audit"
  - `/hospital/[id]/audit` — the hospital's own intake audit (interactive)
  - `/workspace/[deploymentId]` — Journey C deployment workspace (the 6-phase flow)
  - `/registry` — the marketplace registry (assessed tools + verified sites)
- **Shared mock store** in `lib/mock/store.ts` (see §6). All three journeys read/write it.

---

## 2. Architecture & the mock layer

Keep the mock isolated so it's swappable for a real API in one place.

```
lib/
  engine/                 # pure logic — reuse ClearPath engine-module pattern
    readiness-tool.ts     # runToolAssessment(inputs) → ToolReadinessCard
    readiness-site.ts     # runSiteAssessment(inputs) → SiteReadinessCard
    hospital-audit.ts     # runHospitalAudit(answers) → AuditResult
    gates.ts              # the gate/domain definitions (single source of truth)
    soften-certainty.ts   # the ClearPath post-processor, applied to all card text
  mock/
    fixtures/             # seed data: vendors, tools, hospitals, docs, deployments
    store.ts              # in-memory store + localStorage hydrate (see note)
    api.ts                # typed service fns that SIMULATE the API (async + latency)
  schemas/                # Zod schemas per entity (reuse ClearPath pattern)
```

- `lib/mock/api.ts` exposes functions like `getSubmissions()`, `getSubmission(id)`, `createSubmission(input)`, `runAudit(id, answers)`, `createDeployment(submissionId)`, `advanceDeployment(id, phase)`, `publishToRegistry(id)`. Each wraps the store, returns a Promise, and adds a 200–500ms artificial delay so the UI shows real loading states. **These are the only functions the UI calls** — later, swapping their bodies for `fetch()` turns the mock into a live app with zero UI changes.
- **Persistence:** hydrate the store from bundled fixtures on first load; mirror mutations to `localStorage` so a refresh keeps state within a session. (This is a demo nicety, not the "no-upload" doc rule — see §5.) Provide a visible **"Reset demo data"** control in a dev/footer menu.

---

## 3. Journey A — Vendor submission (screens)

A short, confident wizard. Feels like ~4 steps.

1. **Start** — "Submit your tool for a readiness assessment." One-line value prop, `Begin` CTA. Pre-fill option: `Load an example` (CerviAI / ChestXR-TB / SymptomBot) so the demo is one click.
2. **Company & tool** — form: tool name, company, founder, category (screening / SaMD / point-of-care / CDS / patient-facing), one-line description, intended use, intended level of care. (Mirror the ClearPath decomposer idea: if category = "platform", show a "which feature are we assessing?" sub-step.)
3. **Basic questions** — a compact questionnaire that feeds the gates: evidence (any independent study? Indian population? CTRI/RCT?), safety (override pathway? failure modes documented?), regulatory (CDSCO status? DPDP?), workflow (output type: action vs score?), data (ownership, export, residency). Use segmented Yes/Partial/No controls — these map directly to the 16 tool gates.
4. **Attach reports** — show a set of **pre-loaded sample documents** (see §5); user toggles which are "attached" (validation study, CDSCO cert, DPDP policy, clinical eval report, user manual). No real upload — this is the light mode. Show them as an attached-files list with view buttons.
5. **Generate** — loading state ("Assessing across 4 dimensions…") → **Readiness Card** at `/submit/[id]/card`.

### The Readiness Card (ClearPath++ output)
The hero artifact. Four sections + verdict, all text run through `softenCertainty`:
- **Verdict banner** — `DEPLOY` (green) / `DEPLOY WITH CONDITIONS` (amber) / `NOT YET` (coral) + one-line calibrated summary.
- **Four dimension sections**, each with a score bar and its gate results:
  1. Clinical & regulatory (G1–G4)
  2. System fit (G5–G7)
  3. UX & workflow (G8–G11)
  4. Tech & data governance (G12–G16)
- **Conditions to meet** — failed gates (required) + partials (firm up), each with the fix text.
- **Placement recommendation** — level of care, given operability.
- **Attached evidence** — the documents, openable.
- CTA: `Submit to marketplace` and `Send to a hospital` → creates a `Submission` visible in Journey B.

---

## 4. Journey B — Hospital review & audit console (screens)

The buyer's world. This is where "the hospital sees the submission, views documents + the grid, and runs its own audit."

1. **Inbox** (`/hospital`) — a grid/table of submissions: tool name, company, category, vendor verdict badge, date, status (New / In review / Piloting / Declined). Filter by verdict and category. Clean, dense, scannable — bordered rows, not floaty cards.
2. **Submission detail** (`/hospital/[id]`) — three panes:
   - **Readiness Card** (the vendor's, read-only) with the 4-dimension gate grid fully expanded.
   - **Documents** — the attached evidence list; each opens in the **document viewer** (§5).
   - **Gate grid** — every gate with pass/partial/fail and the evidence it draws on.
3. **Run our own audit** (`/hospital/[id]/audit`) — the hospital runs the **private-hospital intake checklist** (13 gates across "Should we pilot / Can we run / Who owns it", incl. the liability + billing gates a vendor card doesn't cover). Interactive segmented controls, pre-filled from the vendor card where they overlap, editable by the hospital. Produces the **hospital's own AuditResult** — a second, independent verdict + score, shown side-by-side with the vendor's card. This is the neutrality point: the hospital's audit is theirs, not the vendor's marketing.
4. **Decision** — `Shortlist` / `Approve for pilot` / `Decline with reasons`. Approving creates a `Deployment` and routes to Journey C.

**Document viewer** must be genuinely usable: open a doc in a right-side drawer or modal, render the PDF (iframe/embed) or image inline, with title, type, and a close control. View-only, no upload (light mode).

---

## 5. Documents (light mode)

- Ship ~5–6 **pre-loaded sample documents** as static assets in `/public/sample-docs/`: e.g. `cerviai-validation-study.pdf`, `cerviai-cdsco-cert.pdf`, `dpdp-privacy-policy.pdf`, `clinical-eval-report.pdf`, `user-manual.pdf`, `ethics-approval.pdf`. Generate simple, realistic-looking placeholder PDFs (title page + a few lines of representative content) — they only need to *open and look real*.
- A `<DocViewer>` component renders a PDF via `<iframe>`/`<embed>` and images inline. **No upload UI** — attaching in Journey A is toggling from this fixed set.
- Documents are referenced by fixtures (each tool/deployment lists which sample docs it "has").

---

## 6. Mock data model (fixtures)

Define Zod schemas + TS types for each, and seed realistic fixtures. Core entities:

```ts
type Vendor      = { id; name; founder; description; website }
type Tool        = { id; vendorId; name; category; intendedUse; careLevel; docIds: string[] }
type GateResult  = { gateId; status: 'pass'|'partial'|'fail'; note? }
type ReadinessCard = {
  id; toolId; verdict: 'DEPLOY'|'CONDITIONS'|'NOTYET';
  summary; dimensionScores: Record<'D1'|'D2'|'D3'|'D4', number>;
  gateResults: GateResult[]; conditions: {gateId; kind:'required'|'firm-up'; fix}[];
  placement; createdAt
}
type Submission  = { id; toolId; readinessCardId; status:'new'|'in-review'|'piloting'|'declined'; hospitalId }
type Document    = { id; name; type:'pdf'|'image'; path; kind } // kind: validation | cdsco | dpdp | eval | manual | ethics
type Hospital    = { id; name; tier:'tertiary'|'tier2'|'tier3'; siteReadiness: SiteReadinessCard }
type SiteReadinessCard = { grade:'TIER_B'|'TIER_A'|'NOT_READY'; domainScores; gaps: {domain; fix}[] }
type AuditResult = { id; submissionId; verdict; score; gateResults: GateResult[]; auditor; createdAt }
type Deployment  = {
  id; submissionId; hospitalId; phase:'setup'|'live'|'documents'|'monitoring'|'report'|'handover';
  dayOf; totalDays; metrics; alerts; roles; docIds; scorecard; recommendation; ownership; published:boolean
}
```

**Seed fixtures (make the demo tell a story):**
- **Vendors/Tools (4):** CerviAI (cervical screening AI, → CONDITIONS), ChestXR-TB (TB screening, → DEPLOY), SymptomBot (patient symptom checker, → NOT YET), + one more (e.g. RetinaScan diabetic-retinopathy AI, → CONDITIONS).
- **Hospitals (3):** Northvale Institute of Medical Sciences (tertiary, site grade TIER_B), District Hospital — Site B (tier2, TIER_A), Rural CHC (tier3, NOT_READY).
- **Submissions:** all four tools submitted to Northvale; CerviAI already approved → has an active `Deployment` mid-flight (day 34 of 90) so Journey C opens on a live pilot.
- **Documents:** the sample set from §5, distributed across tools.
- **Registry:** ChestXR-TB shown as previously deployed with a published result, so `/registry` isn't empty.

---

## 7. The readiness engine (pure logic — the real part)

Reuse the exact logic already validated in the prototype. Single source of truth in `lib/engine/gates.ts`.

**Tool assessment (16 gates, 4 dimensions):**
- D1 Clinical & regulatory: G1 independent validation · G2 fails safe (override + failure modes) · G3 realistic human-in-the-loop · G4 regulatory clear for this use
- D2 System fit: G5 prioritised problem · G6 operable in real conditions · G7 no lock-in / clean exit
- D3 UX & workflow: G8 actionable output · G9 no net burden increase · G10 learnable · G11 clear operator value
- D4 Tech & data governance: G12 data ownership · G13 export/portability · G14 informed consent · G15 secure + DPDP residency · G16 direct performance visibility
- **Verdict rule:** any `fail` → NOT YET; else any `partial` → CONDITIONS; else DEPLOY.
- **Dimension score:** mean of gate values (pass 1 · partial 0.5 · fail 0) → %.
- **Conditions:** fails (required) + partials (firm up), each with fix text.
- **Placement:** from intended level + whether G6 (operable) passes.

**Site assessment (6 domains):** governance & ethics · people & training · infrastructure & IT · data & documentation · regulatory & quality · patient access. Each rated Tier B / Tier A / Not yet. **Grade:** all B → TRIAL-READY (Tier B); all ≥ A → DEPLOYMENT-READY (Tier A); else NOT READY. Gaps = domains below target = the onboarding work order.

**Hospital intake audit (13 gates):** the private-hospital checklist — Should we pilot? (evidence, safety, regulatory, HITL) · Can we run it? (actionable output, burden, integration with our systems, data ownership, **liability/indemnity**) · Who owns it? (named owners, direct monitoring, **billing/reimbursement**, clean exit). Same verdict rule.

**Certainty post-processor:** every user-visible string from the engine passes through `softenCertainty` — never sound more certain than the regulator ("likely", "may", "based on submitted evidence"; never "definitely/must/guaranteed").

---

## 8. Journey C — Deployment workspace (screens)

Six phases mapped to Pre/During/Post, as a persistent stepper (Setup · Live · Documents · Monitoring · Report · Handover). This is a **lightweight CTMS + eTMF + evaluation scorecard** — describe it that way in any UI copy, not as "just eTMF".

- **Setup** — readiness confirmed (site grade + tool verdict + signed docs), roles assigned. `Start pilot`.
- **Live** — metric cards (enrolment, docs %, alerts, follow-up), workflow-&-roles list with status tags.
- **Documents** — the eTMF-lite vault; docs open in the viewer; one shows "signature due" to demonstrate the audit trail.
- **Monitoring** — alerts (referral gap, review backlog) with escalation notes + a drift-watch panel (sensitivity stable, JSD in band, out-of-distribution flag).
- **Report** — auto-generated scorecard (clinical / workflow / referral / cost / equity) + a SCALE / STOP recommendation.
- **Handover** — ownership plan (runs / maintains / pays / referral backstop / monitoring cadence) + `Publish result to marketplace registry` → updates the tool's registry record and closes the loop.

---

## 9. What we leverage vs. what we uniquely solve (design the workspace around this)

Concise competitive read so the build borrows the right patterns and leans into the gaps:

| Platform | What it is | Borrow | We solve what it doesn't |
|---|---|---|---|
| **Parachute AI** (US, YC) | Discover→Evaluate→Deploy→Monitor→Audit + vendor marketplace | The full lifecycle UX blueprint; "escape pilot hell"; audit-ready trail | India rails (CDSCO/DPDP/ABDM/HFR); public + tier 2/3; placement; site-readiness network |
| **CARPL** | Radiology AI marketplace + on-your-data validation + drift monitoring | Validation & drift-monitoring UX; single-pane comparison | Whole-system (not radiology/PACS-only); placement; "NOT YET + conditions"; ownership |
| **Ferrum Health** | Cross-service-line AI governance, vendor-neutral, priced by models/sites/lives | Governance dashboard; à-la-carte; ground-truth measurement | Pre-deployment placement + readiness; site network; India |
| **CHAI** (standards) | Model cards, assurance labs, registry, governance playbooks | Model-card / "nutrition label" registry concept; assurance neutrality | An operational tool, not just a standard; India; deployment lifecycle |
| **CTMS** (Veeva, Medidata, RealTime) | Trial operations + eTMF | eTMF/CTMS workflow patterns for Journey C | Lightweight & pilot-grade; built-in evaluation scorecard; serves AI pilots *and* trials |

**Our four defensible moves, which the UI should make obvious:** (1) **placement** — where in the system a tool belongs, which nobody else outputs; (2) **"NOT YET with conditions"** — coaching, not just filtering; (3) **site-readiness + tier 2/3 network** — unbuilt elsewhere; (4) **two-sided** — ClearPath (vendor) feeding clearpath-platform (buyer), India-native throughout.

---

## 10. Design system

Reuse the ClearPath Teal Trust palette and type:
- Colors: teal `#0F6E56` / teal-light `#E1F5EE` · amber `#BA7517` / `#FAEEDA` · coral `#993C1D` / `#FAECE7` · green `#3B6D11` / `#EAF3DE`. Verdict mapping: DEPLOY→green, CONDITIONS→amber, NOT YET→coral (coral not red — "not yet is a feature, not a failure").
- Type: Georgia/Playfair serif for headings and verdicts; Inter/Calibri sans for body.
- Tailwind config as in the clearpath skill; components named as there (`<ReadinessCard>`, `<ClassBadge>`, `<RiskBadge>`, etc.).
- **Component inventory to build:** `RoleSwitcher`, `SubmissionRow`, `ReadinessCard`, `DimensionBar`, `GateGrid`, `ConditionsList`, `DocViewer`, `AuditPanel`, `VerdictBanner`, `PhaseStepper`, `MetricCard`, `WorkflowRoleList`, `Scorecard`, `OwnershipPlan`, `RegistryRow`, `AlertBanner`.
- Sentence case everywhere; two font weights; minimal borders (0.5px hairlines); flat surfaces; responsive; accessible (labels, focus rings, keyboard nav).

---

## 11. Build guardrails (repeat to Claude Code)

- **No `fetch`, no external APIs, no keys.** All data from `lib/mock`. All async simulated.
- Keep the mock layer isolated behind `lib/mock/api.ts` so it swaps for a real API later without touching UI.
- Reuse ClearPath conventions from the skill: engine modules, Zod validation, `softenCertainty`, brand tokens, component naming, error handling.
- Never invent CDSCO form numbers or regulatory specifics — keep regulatory copy generic and calibrated.
- Seed data must make the story flow A → B → C → registry out of the box.
- It should look like a shipping product: loading states, empty states, hover states, transitions, real spacing.

---

## 12. Suggested build order (demoable early)

1. Scaffold app + role switcher + brand tokens + mock store/api + fixtures.
2. `lib/engine/*` (the real logic) + Zod schemas.
3. Journey A wizard → Readiness Card (the hero artifact).
4. Journey B inbox + submission detail + doc viewer.
5. Journey B "run our audit" panel.
6. Journey C workspace (6 phases) + publish-to-registry loop.
7. `/registry` page + polish (loading/empty/hover, responsive pass).

Ship after step 3 is already a compelling demo; steps 4–7 complete the story.

---

*Companion assets: the guided-demo HTML (visual reference for look/feel and the working engine logic), the PDMF gate set, and the two checklists. This spec supersedes the standalone HTML prototypes as the plan of record for the real build.*
