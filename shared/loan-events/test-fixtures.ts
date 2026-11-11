/** Test-only convenience: exercise the real event rather than browser samples. */
import { newSfOpportunity } from "../../server/sf-opportunity";
import { applyBlendApplication } from "./blend-application";
import { deterministicRandom } from "./random";

export function generatedBlend(loanId: string, borrowerCount: 1 | 2 = 2) {
  const now = new Date("2026-11-11T12:00:00Z");
  const app = newSfOpportunity(loanId, "123456790", "123456", now, borrowerCount);
  return applyBlendApplication(app, { borrowerCount, now, random: deterministicRandom(42) });
}
export function blendDemoSections(loanId: string, borrowerCount: 1 | 2 = 2) {
  return generatedBlend(loanId, borrowerCount).sections;
}
