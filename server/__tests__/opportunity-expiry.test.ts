import { expect, it, vi } from "vitest";
import { contractExpiry, ensureOpportunityExpiry } from "../opportunity-expiry";
import { newSfOpportunity } from "../sf-opportunity";
import { pipelineView } from "../../shared/pipeline";

it.each([
  ["2026-12-31T12:00:00Z", 1, "2027-01-01"],
  ["2028-02-28T12:00:00Z", 1, "2028-02-29"],
  ["2026-03-07T12:00:00Z", 2, "2026-03-09"],
  ["2026-10-31T12:00:00Z", 2, "2026-11-02"],
  ["2026-01-01T02:00:00Z", 90, "2026-03-31"],
])("adds calendar days from Eastern creation date %s", (created, days, expected) => {
  expect(contractExpiry(created, days)).toBe(expected);
});
it("generates new dates in range and projects the saved value", () => {
  for (let i = 0; i < 100; i++) {
    const app = newSfOpportunity("id", "123456790", "123456", new Date("2026-01-01T12:00:00Z"));
    const date = pipelineView(app).contractExpiryDate!;
    expect(date >= "2026-01-02" && date <= "2026-04-01").toBe(true);
  }
});
it("patches only missing expiry and revision with concurrency guards", async () => {
  const app = newSfOpportunity("id", "123456790", "123456");
  delete app.meta!.opportunity!.contractExpiryDate;
  const query = vi.fn(async (_sql: string, args: any[]) => ({ rows: [{
    document: { ...app, revision: app.revision + 1, meta: { ...app.meta,
      opportunity: { ...app.meta!.opportunity, contractExpiryDate: args[1] } } },
  }] }));
  const result = await ensureOpportunityExpiry({ query } as any, app);
  const sql = query.mock.calls[0][0];
  expect(sql).toContain("jsonb_set(document, '{meta,opportunity,contractExpiryDate}'");
  expect(sql).toContain("(document->>'revision')::int=$3");
  expect(sql).toContain("(document->>'generation')::int=$4");
  expect(sql).toContain("AND NOT");
  expect(result.sections).toEqual(app.sections);
  expect(result.meta!.createdAt).toBe(app.meta!.createdAt);
  expect(result.revision).toBe(app.revision + 1);
  await ensureOpportunityExpiry({ query } as any, result);
  expect(query).toHaveBeenCalledTimes(1);
});
it("uses the concurrent winner instead of rerandomizing or overwriting", async () => {
  const app = newSfOpportunity("id", "123456790", "123456");
  const winner = structuredClone(app);
  winner.revision++;
  delete app.meta!.opportunity!.contractExpiryDate;
  const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ document: winner }] });
  expect(await ensureOpportunityExpiry({ query } as any, app)).toEqual(winner);
  expect(query).toHaveBeenCalledTimes(2);
});
