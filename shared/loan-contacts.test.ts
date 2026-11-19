import { expect, it } from "vitest";
import { CONTACT_ROLES, contactFields, loanContactsSchema } from "./loan-contacts";
import { sectionSchemas } from "./loan-contract";

it("allows many contacts of each type and preserves text identifiers", () => {
  const rows = CONTACT_ROLES.flatMap(role => [1, 2].map(n => ({
    id: `${role}-${n}`, role,
    ...Object.fromEntries(contactFields.map(([key]) => [key, "00123"])),
    zip: "00123-4567",
  })));
  expect(loanContactsSchema.parse(rows)).toEqual(rows);
  expect(sectionSchemas["loan-contacts"].safeParse(rows).success).toBe(true);
});

it("rejects duplicate IDs, unknown types, and nontext fields", () => {
  const contact = { id: "one", role: "Seller", name: "Sample" };
  expect(loanContactsSchema.safeParse([contact, contact]).success).toBe(false);
  expect(loanContactsSchema.safeParse([{ ...contact, role: "Unknown" }]).success).toBe(false);
  expect(loanContactsSchema.safeParse([{ ...contact, zip: 12345 }]).success).toBe(false);
  expect(loanContactsSchema.parse([])).toEqual([]);
});
