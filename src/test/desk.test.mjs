/* Run: node src/test/desk.test.mjs   The sales desk maths, on the real quote module. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../site.js", import.meta.url), "utf8").replace("/*{{robots}}*/[]",
  JSON.stringify([{ id: "ubtech-cadebot", name: "UBTECH CadeBot", kind: "Delivery robot", status: "On our floor", img: "" }, { id: "unitree-g1", name: "Unitree G1", kind: "Humanoid", status: "", img: "" }]));
const a = src.indexOf("window.WonderQuote = (function(){"), b = src.indexOf("\n})();", a) + 6;
globalThis.window = {}; (0, eval)(src.slice(a, b)); const Q = window.WonderQuote;
let n = 0; const t = (name, fn) => { fn(); n++; console.log("  ok  " + name); };
const MOTON = { bpro: { cost: 80000 }, ice: { cost: 32800 }, fry: { cost: 33600 } };
const FULL = { machines: MOTON, robots: { "ubtech-cadebot": 4000 }, install_per_machine: 3000, target_margin_pct: 20,
  service_monthly: { first: 800, extra: 400, robot: 150, robot_alone: 120 }, options: { wrap: 900, fitout: { pct: 0.7 }, ext: 200 } };

t("no costs at all: every line is named as missing, nothing is a zero", () => { const d = Q.desk(Q.compute({ qty: { bpro: 1 } }), {});
  assert.equal(d.complete, false); assert.equal(d.cost, null); assert.equal(d.margin, null); assert.equal(d.pct, null); assert.equal(d.verdict, "no target set");
  assert.ok(d.missing.includes("install per machine")); assert.ok(d.rows.every((r) => r.cost === null)); });
t("Moton's price alone gives the equipment margin, and only that", () => { const d = Q.desk(Q.compute({ qty: { bpro: 1 } }), { machines: MOTON });
  assert.deepEqual(d.equipment, { sell: 92000, cost: 80000, margin: 12000, pct: 12000 / 92000 }); assert.equal(d.margin, null); assert.equal(d.complete, false); });
t("every cost known: the full margin, over the term, on target", () => { const c = Q.compute({ qty: { bpro: 1, ice: 1, "ubtech-cadebot": 1 }, opts: { wrap: true, fitout: true, ext: true } }); const d = Q.desk(c, FULL);
  assert.equal(d.complete, true, d.missing.join()); assert.equal(d.sell, c.total);
  const svc = (800 + 400 + 150) * 24, fit = Math.round(c.lines.find((l) => l.id === "fitout").value * 0.7);
  assert.equal(d.cost, 80000 + 32800 + 2 * 3000 + 4000 + svc + 900 + fit + 200 * 24); assert.equal(d.margin, d.sell - d.cost); assert.equal(d.verdict, d.pct >= 0.2 ? "on target" : "under target"); });
t("a thin quote is called under target", () => { const d = Q.desk(Q.compute({ qty: { bpro: 1 } }), { ...FULL, target_margin_pct: 90 }); assert.equal(d.verdict, "under target"); });
t("a robot on its own uses the stand-alone service cost", () => { const d = Q.desk(Q.compute({ qty: { "ubtech-cadebot": 2 } }), FULL);
  assert.equal(d.complete, true, d.missing.join()); assert.equal(d.rows.find((r) => r.kind === "service").cost, 120 * 2 * 24); assert.equal(d.equipment, null); });
t("priced-to-order robots and scoped lines are left out, not costed at zero", () => { const d = Q.desk(Q.compute({ qty: { bpro: 1, "unitree-g1": 1 } }), FULL);
  assert.equal(d.rows.some((r) => r.id === "unitree-g1"), false); assert.equal(d.complete, true); });
t("junk costs are missing, not numbers", () => { for (const bad of [-5, "80000", NaN, Infinity, null, {}, { pct: 2 }]) { const d = Q.desk(Q.compute({ qty: { bpro: 1 }, opts: { wrap: true } }), { ...FULL, options: { wrap: bad } });
  assert.equal(d.complete, false, String(bad)); assert.ok(d.missing.some((m) => /Branding/.test(m))); } });
t("an empty quote has nothing to say", () => { const d = Q.desk(Q.compute({}), FULL); assert.equal(d.rows.length, 0); assert.equal(d.complete, false); assert.equal(d.equipment, null); });
console.log(n + " desk maths tests pass");
