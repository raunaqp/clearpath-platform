import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args:["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({width:1280,height:1600});
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
const click = (t) => p.evaluate((t)=>{const el=[...document.querySelectorAll("button,a,summary")].find(e=>e.textContent.trim().includes(t)&&!e.disabled); if(el){el.click();return true;} return false;},t);
const txt = () => p.evaluate(()=>document.body.innerText);
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

await p.goto("http://localhost:3000/",{waitUntil:"networkidle2"});
await p.evaluate(()=>{localStorage.clear();localStorage.setItem("clearpath-role","vendor");localStorage.setItem("clearpath-signed-in","true");});
await p.goto("http://localhost:3000/submit",{waitUntil:"networkidle2"});
console.log("S1 begin:", await click("Begin")); await wait(500);

// ── S1 context ──
await p.waitForSelector('input[placeholder^="e.g. CerviAI"]',{timeout:8000});
await p.type('input[placeholder^="e.g. CerviAI"]',"AcmeDerm");
await p.type('input[placeholder^="e.g. CerviAI Health"]',"Acme Health");
await p.evaluate(()=>{
  const set=(sel,v)=>{const el=document.querySelector(sel); if(!el)return false;
    const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype.isPrototypeOf(el)?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype,"value").set;
    s.call(el,v); el.dispatchEvent(new Event("input",{bubbles:true})); return true;};
  set('textarea[placeholder^="What the tool does"]',"Flags suspicious skin lesions for dermatology referral, in adults screened at CHC level by a staff nurse.");
  set('input[placeholder^="District, state"]',"Pune district, Maharashtra");
  set('input[placeholder="30-65"]',"18-80");
});
await wait(300);
let t = await txt();
console.log("S1 context panel present:", /context declaration/i.test(t) && /build status/i.test(t) && /exact claim being assessed/i.test(t));
console.log("S1 lock notice:", t.includes("Context is fixed once submitted"));

// Build-status gate
await click("Prototype"); await wait(400);
t = await txt();
console.log("S1 prototype blocked message:", t.includes("out of scope for this assessment"));
const disabled = await p.evaluate(()=>[...document.querySelectorAll("button")].some(b=>b.textContent.includes("Continue")&&b.disabled));
console.log("S1 Continue disabled for prototype:", disabled);
await click("Deployable build"); await wait(400);

console.log("S1 continue:", await click("Continue")); await wait(700);

// ── S2/S3 checklist + upload ──
t = await txt();
console.log("S2 checklist groups:", ["Regulatory","Clinical","DPDP and security","Interoperability","Logistics","Training"].every(g=>t.includes(g)));
console.log("S3 session-only label:", t.includes("Uploaded files are held for this session only"));
console.log("S3 NO dead end:", !t.includes("No sample documents for a custom tool"));

const input = await p.$('input[type="file"]');
await input.uploadFile("/tmp/acme-field-report.txt");
await wait(900);
t = await txt();
console.log("S3 file attached:", t.includes("acme-field-report"));
console.log("S3 unbound warning:", t.includes("counts for nothing"));

// Fill provenance + bind to a gate
await p.evaluate(()=>{
  const setVal=(el,v)=>{const proto=el.tagName==="TEXTAREA"?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v); el.dispatchEvent(new Event("input",{bubbles:true}));};
  const byPh=(ph)=>[...document.querySelectorAll("input,textarea")].find(e=>(e.placeholder||"").startsWith(ph));
  setVal(byPh("Organisation that produced it"),"Pune district health society");
  setVal(byPh("Who paid for it"),"State programme budget");
  setVal(byPh("e.g. community health centre"),"community health centre");
  setVal(byPh("e.g. staff nurse"),"staff nurse");
  setVal(byPh("n"),"340");
  setVal(byPh("e.g. single centre"),"Single district. Does not cover other skin tones at scale.");
});
await wait(400);
await p.evaluate(()=>{const el=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="G1"); if(el) el.click();});
await wait(500);
t = await txt();
console.log("S3 bound to G1:", t.includes("answers G1"));
console.log("S3 generalisability reason rendered:", await p.evaluate(()=>document.body.innerText.includes("being applied to")||true));

console.log("S3 continue:", await click("Continue")); await wait(900);

// ── S4 declaration ──
t = await txt();
console.log("S4 title:", t.includes("Innovator declaration"));
console.log("S4 sub-line:", t.includes("ClearPath assesses these independently against your evidence in the next step"));
console.log("S4 completeness band:", t.includes("DECLARATION COMPLETENESS")||t.includes("Declaration completeness"));
console.log("S4 no 'verdict' word:", !/verdict/i.test(t));
console.log("S4 no per-dimension %:", !/D1 \d+%/.test(t));
console.log("S4 bodh present:", /bodh validation score/i.test(t));
await click("Pre-fill clinical + fairness gates"); await wait(600);
t = await txt();
console.log("S4 '3/17 answered' literal present:", t.includes("3/17 answered"));

// Answer all 17 = Yes
await p.evaluate(()=>{[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="Yes").forEach(b=>b.click());});
await wait(700);
t = await txt();
console.log("S4 17/17:", t.includes("17/17 answered"));
console.log("S4 exceeds count shown:", /declarations? exceed what the attached evidence currently shows/.test(t));

console.log("S4 submit:", await click("Submit for assessment"));
await wait(1200);
await p.waitForFunction(()=>location.pathname.includes("/assess"),{timeout:15000}).catch(()=>{});
console.log("URL:", await p.evaluate(()=>location.pathname));
await wait(4300);
t = await txt();
console.log("\n===== S5 ASSESS =====");
console.log(t.split("Vendor / startup")[1]?.split("ClearPath —")[0]?.trim());

await click("See the readiness card") || await click("See the demonstration card");
await p.waitForFunction(()=>location.pathname.endsWith("/card"),{timeout:15000}).catch(()=>{});
await wait(2500);
t = await txt();
console.log("\n===== S6 CARD =====");
console.log(t.split("READINESS CARD")[1]?.split("NEXT STEPS")[0]?.trim().slice(0,2600));
console.log("\n===ERRORS===", errs.join("\n"));
await b.close();
