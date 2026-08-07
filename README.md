# ClearPath — platform demo

Pre-deployment evaluation, placement and deployment for clinical AI. One app, three journeys: vendors submit a tool, hospitals review and audit it, hospitals run the approved pilot.

**All data in this demo is fictional.** The hospitals, vendors, tools, documents and outcomes are invented for demonstration — they do not represent real institutions, products or results. Nothing here runs against a live backend; everything is served from local fixtures through a mock data layer.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Checks

```bash
npm run engine:smoke          # engine unit checks
npx tsx scripts/acceptance.ts # end-to-end acceptance pass
```

`scripts/browser-verify.mjs` is a Puppeteer walkthrough that is currently broken: it loses its execution context at the first external-link step and exits before the main assertions. It needs fixing before it can be relied on.
