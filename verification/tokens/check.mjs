// Read-only AST checks: never import/evaluate production TS/TSX modules.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import postcss from "postcss";

const read = p => readFileSync(p, "utf8");
const ast = p => ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true);
function literal(n) {
  while (ts.isAsExpression(n) || ts.isSatisfiesExpression(n)) n = n.expression;
  if (ts.isStringLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n)) {
    const out = {};
    for (const p of n.properties) {
      assert(ts.isPropertyAssignment(p), "Only literal properties allowed");
      assert(!Object.hasOwn(out, p.name.text), `Duplicate ${p.name.text}`);
      out[p.name.text] = literal(p.initializer);
    }
    return out;
  }
  throw new Error(`Unsupported literal: ${n.getText()}`);
}
function declaration(file, name) {
  const found = [];
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText() === name) found.push(n.initializer);
    ts.forEachChild(n, visit);
  }
  visit(file);
  assert.equal(found.length, 1, `Unique declaration ${name}`);
  return found[0];
}
const tokens = ast("client/src/lib/design-tokens.ts");
const tailwind = ast("tailwind.config.ts");
const exported = tailwind.statements.find(ts.isExportAssignment).expression.expression;
const theme = exported.properties.find(p => p.name.text === "theme").initializer;
const tw = literal(theme).extend;
const css = postcss.parse(read("client/src/styles/design-tokens.css"));
const globalCss = postcss.parse(read("client/src/index.css"));
function rule(tree, selector) {
  const found = [];
  tree.walkRules(selector, r => found.push(r));
  assert.equal(found.length, 1, `Unique selector ${selector}`);
  return found[0];
}
function value(tree, selector, name) {
  const found = rule(tree, selector).nodes.filter(n => n.type === "decl" && n.prop === name);
  assert.equal(found.length, 1, `Unique ${selector} ${name}`);
  return found[0].value;
}
let assertions = 0;
const equal = (a, b, label) => { assert.deepEqual(a, b, label); assertions++; };
const colors = literal(declaration(tokens, "colors"));
const expected = {
  text: {primary:"#273333",secondary:"#515e5f",tertiary:"#929a9b",brand:"#005b94",link:"#005b94",reverse:"#ffffff",error:"#c63434",warning:"#dd9903",information:"#2079c3"},
  background: {page:"#ffffff",primary:"#ffffff",dark:"#dee1e1",brand:"#005b94",brandSubtle:"#e5eff4",error:"#c63434",errorSubtle:"#ffd5d2",warningSubtle:"#fdefcd",informationSubtle:"#dcf2ff",light:"#f9f9f9",action:"#005b94",errorDisabled:"#ff9c8f",discoverySubtle:"#eaeaf9",success:"#2bb656"},
  icon: {dark:"#273333",brand:"#005b94"},
  border: {subtle:"#dee1e1",dark:"#929a9b",brand:"#005b94",reverse:"#ffffff"}
};
equal(colors, expected, "Exact TS color catalog");
const kebab = s => s.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
for (const [group, entries] of Object.entries(expected))
  for (const [key, v] of Object.entries(entries))
    equal(value(css, ":root", `--roads-${group === "background" ? "bg" : group}-${kebab(key)}`), v, `${group}.${key}`);
const sizes = {
  "headline-100":["32px",600,"40px"], "headline-200":["24px",600,"32px"],
  "headline-300":["20px",600,"24px"], "body-100":["16px",400,"16px"],
  "body-200":["14px",400,"20px"], "body-200-strong":["14px",600,"20px"],
  "caption-100":["12px",400,"16px"], "caption-100-strong":["12px",600,"16px"],
  "label-strong":["16px",600,"16px"]
};
const typography = literal(declaration(tokens, "typography"));
equal(Object.keys(typography), Object.keys(sizes), "TS typography order");
for (const [key, [size, weight, lineHeight]] of Object.entries(sizes)) {
  equal(typography[key], {size, weight, lineHeight}, key);
  for (const [prop, v] of Object.entries({"font-size":size,"font-weight":String(weight),"line-height":lineHeight}))
    equal(value(css, "." + key, prop), v, `${key}.${prop}`);
  equal(value(css, "." + key, "font-family"), "var(--roads-font-family)", key);
  if (key !== "body-200") equal(tw.fontSize[key], [size, {lineHeight,fontWeight:String(weight)}], key);
}
const spacing = {"component-3xs":"2px","component-2xs":"4px","component-xs":"8px","component-m":"12px","component-l":"16px","component-s":"10px","component-xl":"24px","component-2xl":"32px","component-3xl":"40px","layout-xs":"48px"};
equal(literal(declaration(tokens, "spacing")), spacing, "Spacing");
equal(Object.keys(literal(declaration(tokens, "spacing"))), Object.keys(spacing), "Spacing order");
for (const [key, v] of Object.entries(spacing))
  equal(value(css, ":root", "--roads-spacing-" + key), v, key);
for (const key of ["3xs","2xs","xs","m","l","xl"])
  equal(tw.spacing["roads-" + key], spacing["component-" + key], key);
equal(tw.spacing["roads-layout-xs"], "48px", "layout");
for (const key of ["s","2xl","3xl"]) equal(tw.spacing["roads-" + key], undefined, "Exempt spacing " + key);
const radius = {"2xs":"4px",xs:"8px",round:"9999px"};
equal(literal(declaration(tokens, "radius")), radius, "Radius");
for (const [key,v] of Object.entries(radius)) {
  equal(value(css, ":root", "--roads-radius-" + key), v, key);
  equal(tw.borderRadius["roads-" + key], v, key);
}
const font = "'Source Sans Pro', sans-serif";
equal(literal(declaration(tokens, "fontFamily")), font, "TS font");
equal(value(css, ":root", "--roads-font-family"), font, "CSS font");
equal(value(globalCss, ":root", "--font-sans"), font, "Global font");
equal(tw.fontFamily.sans, ["var(--font-sans)"], "Tailwind font reference");
for (const [key, a, b] of [
  ["brand","#005b94","#e5eff4"],["warning","#dd9903","#fdefcd"],
  ["info","#2079c3","#dcf2ff"],["error","#c63434","#ffd5d2"]
]) {
  equal(tw.colors[key].DEFAULT, a, key);
  equal(tw.colors[key].subtle, b, key);
}
for (const [key,v] of Object.entries({"bg-action-disabled":"#8ab4d0","bg-discovery":"#6f5ed3","bg-success-subtle":"#d7f4d7","text-success":"#2bb656"}))
  equal(value(css, ":root", "--roads-" + key), v, "CSS-only " + key);
for (const [key,v] of Object.entries({"font-size":"16px","font-weight":"600","line-height":"24px","letter-spacing":"0","font-family":"var(--roads-font-family)"}))
  equal(value(css, ".headline-400", key), v, key);
equal(tw.fontSize["headline-400"], undefined, "CSS-only headline");
equal(tw.fontSize["body-200"], undefined, "No Tailwind body-200");
equal(tw.colors.brand.dark, "#003d63", "Independent brand.dark");
equal(tw.colors.status, {online:"rgb(34 197 94)",away:"rgb(245 158 11)",busy:"rgb(239 68 68)",offline:"rgb(156 163 175)"}, "Independent status");
equal([tw.borderRadius.lg,tw.borderRadius.md,tw.borderRadius.sm], [".5625rem",".375rem",".1875rem"], "Independent radii");
equal(value(globalCss, ":root", "--radius"), ".5rem", "Independent root radius");
// Check each authored showcase reference without evaluating JSX or mounting App.
const showcase = ast("client/src/pages/design-system.tsx");
const sections = declaration(showcase, "colorSections");
const groups = [
  ["Text Colors","text",["primary","secondary","brand","link","reverse","error","warning","information"]],
  ["Background Colors","background",["page","primary","dark","brand","brandSubtle","error","errorSubtle","warningSubtle","informationSubtle"]],
  ["Icon Colors","icon",["dark","brand"]],["Border Colors","border",["subtle","brand","reverse"]]
];
equal(sections.elements.length, 4, "Showcase groups");
for (const [i, [title, group, keys]] of groups.entries()) {
  const props = Object.fromEntries(sections.elements[i].properties.map(p => [p.name.text, p.initializer]));
  equal(literal(props.title), title, "Showcase title");
  equal(props.tokens.elements.length, keys.length, "Showcase subset");
  for (const [j, key] of keys.entries()) {
    const entry = Object.fromEntries(props.tokens.elements[j].properties.map(p => [p.name.text, p.initializer]));
    equal(literal(entry.name), `${group}-${kebab(key)}`, "Showcase name");
    equal(entry.value.getText(), `colors.${group}.${key}`, "Showcase TS path");
    equal(literal(entry.cssVar), `--roads-${group === "background" ? "bg" : group}-${kebab(key)}`, "Showcase CSS path");
  }
}
// Pin independent semantic values, captions and cascade byte/order without
// asserting false HSL/hex or cross-theme equivalence.
const hashes = {
  "client/src/styles/design-tokens.css":"6e51b38f22e12e4f35634a4f8a34e4264f0a3a3b1703684207ca566c7eec4b71",
  "client/src/index.css":"08ec13d2c8507f47d81063831d9d4d1815dae36db8012176bd988cc970939c70",
  "tailwind.config.ts":"dc4c25f8cdd13c655c6eafa397f44dfd8fa5c5234795e361a6d29d5430872817",
  "client/src/pages/design-system.tsx":"96f6edb185e8b4fbe5034901176e9d9de145545f4a7e4a1defc0d1f499ed3aca"
};
for (const [path, hash] of Object.entries(hashes))
  equal(createHash("sha256").update(readFileSync(path)).digest("hex"), hash, "Authored order and exemptions " + path);
const result = {status:"passed", assertions, browser:"not run", emittedCss:"checked separately"};
writeFileSync("../authored-results.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
