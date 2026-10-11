/* Run: python3 build.py && node src/test/curtain.test.mjs   Nobody is left behind the first-visit curtain.
   The built pages, in headless Chrome at phone size, three ways: script off, the site script stopping at its first
   statement, and healthy. On 12 Oct 2026 the curtain shipped up and only site.js could lift it, 870 lines in, so one
   uncaught error anywhere above that line left every page a blank cream sheet. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(CHROME)) { console.log("curtain tests skipped: no Chrome at " + CHROME); process.exit(0); }
const SITE = fileURLToPath(new URL("../../", import.meta.url));
const PAGES = ["index.html", "robot-coffee-machines/index.html", "machines/unitree-g1/index.html"];
const STOP = "Object.defineProperty(window,'WonderSneak',{configurable:true,set:function(){throw new Error('test: the site script stops here');}});";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9800 + Math.floor(Math.random() * 150);
const profile = `/tmp/wr-curtain-test-${process.pid}`;
const chrome = spawn(CHROME, ["--headless=new", "--allow-file-access-from-files", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
// Chrome is still writing its profile as it dies, so wait for it before clearing up.
const stop = async () => { chrome.kill(); await new Promise((r) => chrome.once("exit", r)); rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); };
await sleep(1500);

// One fresh tab per case, so every case is a first visit this session.
async function visit(page, mode, waitMs) {
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(), errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  for (const d of ["Page", "Runtime", "DOM", "CSS"]) await send(d + ".enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 393, height: 659, deviceScaleFactor: 2, mobile: true });
  if (mode === "off") await send("Emulation.setScriptExecutionDisabled", { value: true });
  if (mode === "stopped") await send("Page.addScriptToEvaluateOnNewDocument", { source: STOP });
  await send("Page.navigate", { url: "file://" + SITE + page });
  await sleep(waitMs);
  // Read through the DOM and CSS domains: they answer with page script off.
  const doc = (await send("DOM.getDocument", { depth: 1 })).result.root;
  const style = async (sel) => { const n = (await send("DOM.querySelector", { nodeId: doc.nodeId, selector: sel })).result?.nodeId; if (!n) return null;
    const cs = (await send("CSS.getComputedStyleForNode", { nodeId: n })).result.computedStyle; return Object.fromEntries(cs.filter((p) => ["display", "opacity", "visibility"].includes(p.name)).map((p) => [p.name, p.value])); };
  const out = { curtain: await style("#loader"), h1: await style("main h1"), raised: !!(await style("html.wr-curtain")), errors };
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
  return out;
}
const down = (c) => c === null || c.display === "none" || c.visibility === "hidden";
const shown = (h) => h && h.display !== "none" && h.visibility === "visible" && +h.opacity === 1;

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("  ok  " + name); };
try {
for (const page of PAGES) {
  await t(page + ", script off: the curtain never goes up and the headline is there", async () => { const s = await visit(page, "off", 1800);
    assert.ok(down(s.curtain), JSON.stringify(s.curtain)); assert.equal(s.raised, false); assert.ok(shown(s.h1), JSON.stringify(s.h1)); });
  await t(page + ", site script stops at its first statement: the shell drops the curtain by itself", async () => { const s = await visit(page, "stopped", 3700);
    assert.ok(s.errors.some((e) => /the site script stops here/.test(e)), "the stop did not fire: " + s.errors.join(" | "));
    assert.ok(down(s.curtain), JSON.stringify(s.curtain)); assert.equal(s.raised, false); assert.ok(shown(s.h1), JSON.stringify(s.h1)); });
}
await t("index.html, healthy: the curtain goes up for a first visit", async () => { const s = await visit("index.html", "healthy", 350);
  assert.equal(s.raised, true); assert.equal(s.curtain && s.curtain.display, "grid"); assert.deepEqual(s.errors, []); });
await t("index.html, healthy: and it is gone, with nothing left behind, inside five seconds", async () => { const s = await visit("index.html", "healthy", 5000);
  assert.equal(s.curtain, null); assert.equal(s.raised, false); assert.ok(shown(s.h1), JSON.stringify(s.h1)); assert.deepEqual(s.errors, []); });
console.log(n + " curtain tests pass");
} finally { await stop(); }
