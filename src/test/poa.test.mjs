/* Run: node src/test/poa.test.mjs   With prices off, nothing the engine says to a visitor carries a figure;
   with prices on, the same quote carries them. The build writes the switch in; here both values are tried. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const ROBOTS = JSON.stringify([{ id: "ubtech-cadebot", name: "UBTECH CadeBot", kind: "Delivery robot", status: "On our floor", img: "" }, { id: "unitree-g1", name: "Unitree G1", kind: "Humanoid", status: "", img: "" }]);
function engine(poa) {
  const src = readFileSync(new URL("../site.js", import.meta.url), "utf8").replace("/*{{robots}}*/[]", ROBOTS).replace("/*{{poa}}*/false", "/*{{poa}}*/" + poa);
  const a = src.indexOf("window.WonderQuote = (function(){"), b = src.indexOf("\n})();", a) + 6;
  globalThis.window = {}; (0, eval)(src.slice(a, b)); return window.WonderQuote;
}
let n = 0; const t = (name, fn) => { fn(); n++; console.log("  ok  " + name); };
const STATE = { qty: { bpro: 1, fry: 2, "ubtech-cadebot": 1, "unitree-g1": 1 }, parts: { syr: true }, opts: { space: true, wrap: true, extract: true, ext: true }, site: "far" };
const FIGURE = /\$\s?\d/;
const said = (Q, c) => [Q.summaryLine(c), Q.sumsHtml(c), Q.sumsHtml(c, true), Q.payHtml(c, { ask: "#eoi" })]
  .concat(c.lines.map((l) => Q.valueText(l) + " " + Q.valueNote(l) + " " + l.sub))
  .concat(c.lines.map((l) => { const d = Q.detailFor(l, c); return [d.lead].concat((d.facts || []).map((f) => f.join(" "))).join(" "); }))
  .concat(Q.termsList(c, "1 January 2027").map((x) => x.join(" "))).join("\n");

t("prices off: the engine says no figure to a visitor", () => { const Q = engine(true); const c = Q.compute(STATE);
  assert.equal(Q.POA, true); const words = said(Q, c); assert.doesNotMatch(words, FIGURE, words.match(/.*\$\s?\d.*/)?.[0]); });
t("prices off: every line reads POA except what is included", () => { const Q = engine(true); const c = Q.compute(STATE);
  for (const l of c.lines) assert.equal(Q.valueText(l), l.value === 0 ? "Included" : "POA", l.id); });
t("prices off: the numbers are still computed for the sales desk", () => { const Q = engine(true); const c = Q.compute(STATE);
  assert.ok(c.monthly > 0 && c.installed > 0 && c.total > 0);
  const machines = c.lines.filter((l) => l.kind === "machine").reduce((a, l) => a + l.value, 0);
  assert.equal(Q.desk(c, { machines: { bpro: { cost: 80000 } } }).equipment.sell, machines); });
t("prices off: a package quotes as POA and its sums are gone", () => { const Q = engine(true); const c = Q.packageQuote(Q.PACKAGES[0]);
  assert.equal(Q.sumsHtml(c), ""); assert.match(Q.payHtml(c), /POA/); assert.doesNotMatch(Q.payHtml(c), FIGURE); });
t("prices on: the same quote carries its figures", () => { const Q = engine(false); const c = Q.compute(STATE);
  assert.equal(Q.POA, false); assert.match(said(Q, c), FIGURE); assert.match(Q.valueText(c.lines[0]), FIGURE); assert.match(Q.sumsHtml(c), FIGURE); });
console.log(n + " POA tests pass");
