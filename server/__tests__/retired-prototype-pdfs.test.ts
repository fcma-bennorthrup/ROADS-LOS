import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { RETIRED_PROTOTYPE_PDFS } from "../retired-prototype-pdfs";
import { shouldIgnorePath } from "../sync-mechanics";
import { hasExcludedPendingPaths } from "../sync-file-policy";

describe("retired prototype PDFs", () => {
  it("excludes only the retired assets and rejects old pending plans", () => {
    RETIRED_PROTOTYPE_PDFS.forEach(path => {
      expect(shouldIgnorePath(path)).toBe(true);
      expect(existsSync(path)).toBe(false);
      expect(hasExcludedPendingPaths({ conflicts: [], safeToUpdate: [{ path }] })).toBe(true);
      expect(hasExcludedPendingPaths({ conflicts: [{ path }], safeToUpdate: [] })).toBe(true);
    });
    expect(shouldIgnorePath("attached_assets/new-reference.pdf")).toBe(false);
    expect(shouldIgnorePath("client/public/new-document.pdf")).toBe(false);
  });
  it("keeps document controls without missing-file imports or PDF navigation", () => {
    for (const file of ["DocumentsContent", "DisclosureDocumentsContent", "ProductPricingContent", "DecisioningSummaryContent"]) {
      const source = readFileSync(`client/src/components/loan/${file}.tsx`, "utf8");
      expect(source).not.toMatch(/\.pdf["']/);
    }
    const closing = readFileSync("client/src/components/loan/DocumentsContent.tsx", "utf8");
    expect(closing).toContain("View Closing Package");
    expect(closing).toContain("View Closing Disclosure");
    const decision = readFileSync("client/src/components/loan/DecisioningSummaryContent.tsx", "utf8");
    expect(decision).toContain("Generate Decision Letter");
  });
});
