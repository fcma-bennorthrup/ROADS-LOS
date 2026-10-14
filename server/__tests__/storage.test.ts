import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { borrowers } from "@shared/schema";
import { MemStorage } from "../storage";

describe("demo borrower identities", () => {
  it("keeps unique UUID identities across independent server storage lifetimes", async () => {
    const before = await new MemStorage().getBorrowersByLoanId("1");
    const restarted = new MemStorage();
    expect(before).toHaveLength(3);
    expect(new Set(before.map((borrower) => borrower.id)).size).toBe(3);
    for (const borrower of before) {
      expect(borrower.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    expect(await restarted.getBorrowersByLoanId("1")).toEqual(before);
    expect(await restarted.getBorrowersByLoanId("other")).toEqual([]);
  });

  it("retains random UUID generation for ordinary borrower inserts and new users", async () => {
    expect(new PgDialect().sqlToQuery(borrowers.id.default as SQL).sql).toBe("gen_random_uuid()");
    const first = await new MemStorage().createUser({ username: "test", password: "test-only" });
    const second = await new MemStorage().createUser({ username: "test", password: "test-only" });
    expect(first.id).not.toBe(second.id);
  });
});
