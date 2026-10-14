import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assumedDeliveryCalendarDate, blankBorrowerDetails, summarizeAssumedDeliveryDate,
} from "../closing-disclosure-borrowers";

const record = { id: 1, generatedAt: "2026-01-01T12:00:00.000Z", deliveredAt: "2026-10-14T12:00:00.000Z" };
const first = { ...blankBorrowerDetails("a"), deliveryMethod: "Blend" as const, deliveryDate: "2026-10-14" };
const second = { ...first, borrowerId: "b", cdViewed: "No" as const };
afterEach(() => vi.unstubAllEnvs());

describe("assumed delivery calendar dates", () => {
  it.each([
    ["2026-10-14", "2026-10-17"], // The user's Wednesday-to-Saturday example.
    ["2026-01-30", "2026-02-02"],
    ["2026-12-30", "2027-01-02"],
    ["2028-02-27", "2028-03-01"],
    ["2026-02-27", "2026-03-02"],
    ["2026-03-07", "2026-03-10"], // US spring DST transition.
    ["2026-10-31", "2026-11-03"], // US fall DST transition.
    ["2026-11-25", "2026-11-28"], // No holiday or weekend exclusions.
    ["", ""],
  ])("adds three calendar days: %s → %s", (source, expected) => {
    for (const timezone of ["UTC", "America/Chicago", "Asia/Tokyo"]) {
      vi.stubEnv("TZ", timezone);
      expect(assumedDeliveryCalendarDate(source)).toBe(expected);
    }
  });

  it("fails explicitly instead of normalizing an invalid or unsupported calendar date", () => {
    for (const source of ["2026-02-30", "not-a-date", "10/14/2026", "9999-12-31"]) {
      expect(() => assumedDeliveryCalendarDate(source)).toThrow();
    }
  });

  it("keeps the undisclosed/unmarked state blank even with manually entered borrower dates", () => {
    expect(summarizeAssumedDeliveryDate({ ...record, deliveredAt: null }, [first])).toBe("");
  });

  it("reuses shared, mixed and partial conventions without changing source or viewing data", () => {
    const details = [first, second];
    const before = JSON.stringify({ record, details });
    expect(summarizeAssumedDeliveryDate(record, details)).toBe("10/17/2026");
    expect(summarizeAssumedDeliveryDate(record, [first, { ...second, deliveryDate: "2026-10-15" }])).toBe("Multiple dates");
    expect(summarizeAssumedDeliveryDate(record, [first, blankBorrowerDetails("c")])).toBe("Partially recorded");
    expect(summarizeAssumedDeliveryDate(record, [
      first, { ...second, deliveryDate: "2026-10-15" }, blankBorrowerDetails("c"),
    ])).toBe("Multiple dates · partially recorded");
    expect(summarizeAssumedDeliveryDate(record, [{ ...first, deliveryDate: "2026-10-20" }])).toBe("10/23/2026");
    expect(JSON.stringify({ record, details })).toBe(before);
  });

  it("uses the local legacy timestamp day only when no borrower dates are recorded", () => {
    vi.stubEnv("TZ", "America/Chicago");
    const legacy = { ...record, deliveredAt: "2026-10-15T04:58:00.000Z" };
    expect(summarizeAssumedDeliveryDate(legacy, [])).toBe("10/17/2026");
    expect(summarizeAssumedDeliveryDate(legacy, [blankBorrowerDetails("a")])).toBe("10/17/2026");
    expect(summarizeAssumedDeliveryDate(legacy, [{ ...first, deliveryDate: "2026-10-20" }])).toBe("10/23/2026");
    vi.stubEnv("TZ", "Asia/Tokyo");
    expect(summarizeAssumedDeliveryDate({ ...record, deliveredAt: "2026-10-14T16:05:00.000Z" }, [])).toBe("10/18/2026");
    expect(() => summarizeAssumedDeliveryDate({ ...record, deliveredAt: "invalid" }, [])).toThrow("could not be read");
  });
});
