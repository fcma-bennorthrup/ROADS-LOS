import { describe, expect, it } from "vitest";
import { formatActivityTimestamp } from "../loan-activity";

describe("formatActivityTimestamp", () => {
  it("formats loan activity timestamps consistently", () => {
    const afternoon = new Date(2026, 8, 14, 15, 7);
    const morning = new Date(2026, 0, 2, 9, 5);

    expect(formatActivityTimestamp(afternoon)).toBe("September 14, 2026 at 3:07pm");
    expect(formatActivityTimestamp(morning)).toBe("January 2, 2026 at 9:05am");
  });
});
