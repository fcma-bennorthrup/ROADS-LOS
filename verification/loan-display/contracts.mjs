import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";

const values = [
  ["0", "$0.00"], ["-1234.5", "$-1,234.50"], ["1234.567", "$1,234.57"],
  ["", "$NaN"], ["invalid", "$NaN"], ["123.45rest", "$123.45"],
  ["  -12.3suffix", "$-12.30"], ["1,234", "$1.00"], ["$12", "$NaN"],
  ["-0", "$-0.00"], ["1e3", "$1,000.00"], ["Infinity", "$∞"],
];
let state, section;
const load = (file) => {
  const code = transformSync(readFileSync(file, "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  const module = { exports: {} };
  const require = (name) => {
    if (name === "react/jsx-runtime") return { jsx: node, jsxs: node };
    if (name === "react") return { useState: initial => [section ?? initial, () => {}], useEffect: () => {} };
    if (name === "wouter") return { useParams: () => ({ id: "synthetic" }), useSearch: () => "" };
    if (name === "@tanstack/react-query") return { useQuery: options => {
      assert.deepEqual(Array.from(options.queryKey), ["/api/loans", "synthetic"]);
      assert.deepEqual(Object.keys(options), ["queryKey"]);
      return state;
    } };
    if (name === "@/lib/loan-display") return load("client/src/lib/loan-display.ts");
    return new Proxy({}, { get: (_, key) => String(key) });
  };
  vm.runInNewContext(code, { module, exports: module.exports, require });
  return module.exports;
};
function node(type, props) { return { type: typeof type === "function" ? type.name : type, props }; }
const normalize = tree => JSON.parse(JSON.stringify(tree, (_, v) => typeof v === "function" ? "[function]" : v));
const { formatCurrency } = load("client/src/lib/loan-display.ts");
const fields = ["displayAmount", "totalCv", "cashReserves", "totalLoanAmount", "amountRequested",
  "financedFees", "taxesInsurance", "principalInterest", "totalMonthlyPayment", "cashToClose"];
const pages = ["summary", "origination", "decisioning", "documents", "closing-booking", "history", "coming-soon"];
let checks = 0;
for (const [input, expected] of values) {
  assert.equal(formatCurrency(input), expected);
  for (const page of pages) {
    const candidate = load(`client/src/pages/loan-${page}.tsx`).default;
    const baseline = load(`client/src/pages/baseline-${page}.tsx`).default;
    const loan = Object.fromEntries(fields.map((field, i) => [field, values[(values.findIndex(v => v[0] === input) + i) % values.length][0]]));
    loan.borrowers = [];
    for (const variant of [
      { isLoading: true }, { error: new Error("synthetic") }, { data: null },
      { data: loan }, { data: loan, error: new Error("cached error") },
    ]) {
      state = variant;
      for (section of [undefined, "Loan Details", "Closing Documents", "Borrower Financials", "Booking"]) {
        const a = normalize(candidate({ tabName: "Retained Page" }));
        const b = normalize(baseline({ tabName: "Retained Page" }));
        assert.deepEqual(a, b, `${page}: ${input}`);
        checks++;
      }
    }
  }
}
console.log(`${values.length} literal currency cases; ${checks} baseline/candidate full page-element/prop comparisons passed.`);
